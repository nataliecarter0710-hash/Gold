#!/usr/bin/env python3
"""Safe, database-free executable contract tests for the staging design.

These tests model the intended rules in memory. They do NOT connect to PostgreSQL,
validate real RLS/grants, or prove production concurrency correctness.
"""
from dataclasses import dataclass, field
from threading import Barrier, Thread, Lock
import unittest

ALLOWED = {
    "CREATED": {"OPEN", "CANCELLED"},
    "OPEN": {"CLOSED", "CANCELLED"},
    "CLOSED": {"RESULT_RECORDED", "REVIEW", "CANCELLED"},
    "RESULT_RECORDED": {"REVIEW", "COMPLETE"},
    "REVIEW": {"RESULT_RECORDED", "CANCELLED"},
    "COMPLETE": set(), "CANCELLED": set(),
}

@dataclass
class Round:
    status: str = "CREATED"
    result: dict | None = None
    version: int = 0
    history: list = field(default_factory=list)

class ContractModel:
    def __init__(self):
        self.rounds = {}
        self.bets = {}
        self.balance = {"A": 1000, "B": 1000}
        self.ledger = []
        self.lock = Lock()

    def transition(self, r, new):
        if new not in ALLOWED[r.status]:
            raise ValueError("invalid transition")
        r.status = new

    def record_result(self, r, payload, actor="tester"):
        if r.status != "CLOSED" or r.result is not None:
            raise ValueError("result record not permitted")
        r.result = dict(payload); r.version = 1
        r.history.append((r.version, dict(payload), actor, "initial"))

    def correct(self, r, payload, reason, actor="reviewer"):
        if r.status != "REVIEW" or not reason.strip() or r.result is None:
            raise ValueError("review correction not permitted")
        old = (r.version, dict(r.result))
        r.version += 1; r.result = dict(payload)
        r.history.append((r.version, dict(payload), actor, reason))
        if old[0] >= r.version:
            raise AssertionError("version must increase")

    def request(self, user, key, payload):
        if not key or not key.strip(): raise ValueError("key required")
        scoped = (user, key)
        with self.lock:
            if scoped in self.bets:
                prior = self.bets[scoped]
                if prior["payload"] != payload: raise ValueError("payload conflict")
                return prior, False
            row = {"id": len(self.bets)+1, "payload": dict(payload), "user": user}
            self.bets[scoped] = row
            return row, True

    def can_read(self, viewer, row):
        return viewer == row["user"]


class ContractTests(unittest.TestCase):
    def setUp(self): self.m = ContractModel()

    def test_round_valid_paths_and_cancellations(self):
        r=Round(); self.m.transition(r,"OPEN"); self.m.transition(r,"CLOSED")
        self.m.transition(r,"RESULT_RECORDED") if False else None
        # Result recording is deliberately separate from transition.
        self.m.transition(r,"REVIEW")
        self.m.transition(r,"CANCELLED")
        self.assertEqual(r.status,"CANCELLED")
        c=Round(); self.m.transition(c,"CANCELLED")
        self.assertEqual(c.status,"CANCELLED")

    def test_invalid_edges_and_terminal_states(self):
        for start, forbidden in [("CREATED","CLOSED"),("OPEN","CREATED"),
            ("CLOSED","OPEN"),("COMPLETE","OPEN"),("CANCELLED","OPEN")]:
            r=Round(status=start)
            with self.assertRaises(ValueError): self.m.transition(r,forbidden)
            self.assertEqual(r.status,start)

    def test_complete_path_and_review_correction(self):
        r=Round(); self.m.transition(r,"OPEN"); self.m.transition(r,"CLOSED")
        self.m.record_result(r,{"winner":"X"})
        with self.assertRaises(ValueError): self.m.correct(r,{"winner":"Y"},"")
        self.m.transition(r,"REVIEW")
        self.m.correct(r,{"winner":"Y"},"verified correction")
        self.assertEqual(r.version,2)
        self.assertEqual(r.history[0][1],{"winner":"X"})
        self.assertEqual(r.history[1][3],"verified correction")
        self.m.transition(r,"RESULT_RECORDED"); self.m.transition(r,"COMPLETE")
        with self.assertRaises(ValueError): self.m.transition(r,"REVIEW")

    def test_result_immutable_outside_review_and_correction_requires_reason(self):
        r=Round(status="CLOSED"); self.m.record_result(r,{"winner":"X"})
        with self.assertRaises(ValueError): self.m.record_result(r,{"winner":"Z"})
        self.m.transition(r,"REVIEW")
        with self.assertRaises(ValueError): self.m.correct(r,{"winner":"Z"}," ")
        self.assertEqual(r.version,1)

    def test_idempotent_reuse_and_payload_conflict(self):
        p={"round":"R1","selection":"X","stake":10,"snapshot":"s"}
        first,created=self.m.request("A","k1",p); self.assertTrue(created)
        retry,created=self.m.request("A","k1",p); self.assertFalse(created)
        self.assertEqual(first["id"],retry["id"])
        with self.assertRaises(ValueError): self.m.request("A","k1",{**p,"stake":20})
        other,_=self.m.request("B","k1",p); self.assertNotEqual(first["id"],other["id"])
        with self.assertRaises(ValueError): self.m.request("A"," ",p)

    def test_concurrent_duplicate_requests(self):
        barrier=Barrier(2); outputs=[]
        p={"round":"R2","selection":"Y","stake":5}
        def worker():
            barrier.wait(); outputs.append(self.m.request("A","race",p))
        threads=[Thread(target=worker) for _ in range(2)]
        [t.start() for t in threads]; [t.join() for t in threads]
        self.assertEqual(sum(1 for _,created in outputs if created),1)
        self.assertEqual(outputs[0][0]["id"],outputs[1][0]["id"])
        self.assertEqual(len(self.m.bets),1)

    def test_concurrent_payload_conflict(self):
        barrier=Barrier(2); outcomes=[]
        payloads=[{"stake":5},{"stake":9}]
        def worker(p):
            barrier.wait()
            try: outcomes.append(("ok",self.m.request("A","race-conflict",p)[0]["id"]))
            except ValueError: outcomes.append(("conflict",None))
        threads=[Thread(target=worker,args=(p,)) for p in payloads]
        [t.start() for t in threads]; [t.join() for t in threads]
        self.assertEqual(sum(x[0]=="ok" for x in outcomes),1)
        self.assertEqual(sum(x[0]=="conflict" for x in outcomes),1)
        self.assertEqual(len(self.m.bets),1)

    def test_mock_user_isolation(self):
        a,_=self.m.request("A","a1",{"stake":1})
        b,_=self.m.request("B","b1",{"stake":2})
        self.assertTrue(self.m.can_read("A",a))
        self.assertFalse(self.m.can_read("A",b))
        self.assertTrue(self.m.can_read("B",b))
        self.assertFalse(self.m.can_read("B",a))

    def test_snapshots_preserved_and_no_operational_mutations(self):
        snap={"selection_snapshot":"sel","payout_rule_snapshot":"rule","result_snapshot":"result"}
        row,_=self.m.request("A","snap",snap)
        self.assertEqual(row["payload"],snap)
        self.assertEqual(self.m.balance,{"A":1000,"B":1000})
        self.assertEqual(self.m.ledger,[])
        self.assertEqual(self.m.rounds,{})

if __name__ == "__main__":
    unittest.main(verbosity=2)
