
'use client';
// FULL FEATURED Admin "User Search & Management" page for Next.js + Firebase (Firestore + Auth)

import React, { useEffect, useState, useMemo } from "react";
import {
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  startAt,
  endAt,
  limit,
  onSnapshot,
  updateDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// ---------------------- TYPES ----------------------
type UserDoc = {
  inGameName?: string;
  email?: string;
  phone?: string;
  wallet?: {
    deposit: number;
    winning: number;
    bonus: number;
  };
  isAdmin?: boolean;
  suspended?: boolean;
  registeredOn?: { seconds?: number } | any;
};

// ---------------------- UTIL ----------------------
function formatTime(ts: any) {
  if (!ts) return "-";
  try {
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    return new Date(ts).toLocaleString();
  } catch (e) {
    return "-";
  }
}

function debounce<T extends (...args: any[]) => void>(fn: T, wait = 300) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// ---------------------- COMPONENT ----------------------
export default function AdminUsersPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [queryText, setQueryText] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; data: UserDoc }>>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; data: UserDoc } | null>(null);

  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [logsLoading, setLogsLoading] = useState(false);

  // Auth and admin check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      setLoadingAuth(false);
      if (!u) {
        setIsAdminUser(false);
        return;
      }
      // Check users collection for isAdmin flag
      try {
        const userDoc = await getDoc(doc(db, "users", u.uid));
        const data = userDoc.exists() ? (userDoc.data() as UserDoc) : null;
        setIsAdminUser(!!data?.isAdmin);
      } catch (e) {
        console.error("admin check failed", e);
        setIsAdminUser(false);
      }
    });
    return () => unsub();
  }, []);

  // Debounced search handler
  const doSearch = useMemo(
    () =>
      debounce(async (text: string) => {
        setSearching(true);
        setResults([]);
        setSelectedUser(null);

        const q = text.trim();
        if (!q) {
          setSearching(false);
          return setResults([]);
        }

        try {
          // 1) If input looks like a UID (exact) — getDoc
          if (/^[A-Za-z0-9_-]{20,}$/.test(q)) {
            const docRef = doc(db, "users", q);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              setResults([{ id: docSnap.id, data: docSnap.data() as UserDoc }]);
              setSearching(false);
              return;
            }
          }

          // 2) If input is numeric maybe phone
          if (/^\d{10}$/.test(q)) { // Search for 10-digit numbers
            const usersRef = collection(db, "users");
            // Also search with +91 prefix
            const phoneQuery = query(usersRef, where("phone", "in", [q, `+91${q}`]), limit(20));
            const unsubPhone = onSnapshot(phoneQuery, (snap) => {
              const items: Array<{ id: string; data: UserDoc }> = [];
              snap.forEach((d) => items.push({ id: d.id, data: d.data() as UserDoc }));
              setResults(items);
              setSearching(false);
              if (typeof unsubPhone === "function") unsubPhone();
            });
            return;
          }
          
          if (/^\+?\d{4,}$/.test(q)) {
            const usersRef = collection(db, "users");
            const phoneQuery = query(
              usersRef,
              orderBy("phone"),
              startAt(q),
              endAt(q + "\\uf8ff"),
              limit(20)
            );
            const unsubPhone = onSnapshot(phoneQuery, (snap) => {
              const items: Array<{ id: string; data: UserDoc }> = [];
              snap.forEach((d) => items.push({ id: d.id, data: d.data() as UserDoc }));
              setResults(items);
              setSearching(false);
              if (typeof unsubPhone === "function") unsubPhone();
            });
            return;
          }

          // 3) Search by name prefix — try name then email
          const usersRef = collection(db, "users");
          const nameQuery = query(usersRef, orderBy("inGameName"), startAt(q), endAt(q + "\\uf8ff"), limit(30));
          const emailQuery = query(usersRef, orderBy("email"), startAt(q), endAt(q + "\\uf8ff"), limit(30));

          // Use onSnapshot to get real-time results but unsubscribe after first response
          const unsubName = onSnapshot(nameQuery, (snap) => {
            const items: Array<{ id: string; data: UserDoc }> = [];
            snap.forEach((d) => items.push({ id: d.id, data: d.data() as UserDoc }));
            if (items.length) {
              setResults(items);
              setSearching(false);
              if (typeof unsubName === "function") unsubName();
            } else {
              const unsubEmail = onSnapshot(emailQuery, (snap2) => {
                const items2: Array<{ id: string; data: UserDoc }> = [];
                snap2.forEach((d) => items2.push({ id: d.id, data: d.data() as UserDoc }));
                setResults(items2);
                setSearching(false);
                if (typeof unsubEmail === "function") unsubEmail();
                if (typeof unsubName === "function") unsubName();
              });
            }
          });
        } catch (err) {
          console.error("search failed", err);
          setSearching(false);
          alert("Search failed. Check console.");
        }
      }, 400),
    []
  );

  useEffect(() => {
    doSearch(queryText);
  }, [queryText, doSearch]);

  const selectUser = async (id: string) => {
    const d = await getDoc(doc(db, "users", id));
    if (d.exists()) {
      setSelectedUser({ id: d.id, data: d.data() as UserDoc });
    }
  };

  // ACTIONS: suspend/unsuspend, adjust balance, delete
  const requireAdmin = () => {
    if (!currentUser || !isAdminUser) {
      alert("You are not authorized to perform this action.");
      return false;
    }
    return true;
  };

  const toggleSuspend = async (id: string, currentlySuspended?: boolean) => {
    if (!requireAdmin()) return;
    const confirmMsg = currentlySuspended
      ? "Un-suspend this user?"
      : "Suspend this user? They will lose access until unsuspended.";
    if (!confirm(confirmMsg)) return;
    try {
      await updateDoc(doc(db, "users", id), { suspended: !currentlySuspended });
      await addDoc(collection(db, "adminLogs"), {
        type: "suspend-toggle",
        target: id,
        actor: currentUser?.uid,
        value: !currentlySuspended,
        createdAt: serverTimestamp(),
      });
      alert("Done.");
      // refresh selected user to show new state
      if (selectedUser) {
        selectUser(selectedUser.id);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update suspended state.");
    }
  };

  const adjustBalance = async (id: string, amount: number) => {
    if (!requireAdmin()) return;
    if (!confirm(`Apply balance change of ${amount} to user ${id} ?`)) return;
    try {
      const uRef = doc(db, "users", id);
      const snap = await getDoc(uRef);
      if (!snap.exists()) {
        alert("User not found");
        return;
      }
      const data = snap.data() as UserDoc;
      const newDeposit = (data.wallet?.deposit || 0) + amount;
      await updateDoc(uRef, { "wallet.deposit": newDeposit });
      await addDoc(collection(db, "adminLogs"), {
        type: "adjust-balance",
        target: id,
        actor: currentUser?.uid,
        value: amount,
        newBalance: newDeposit,
        createdAt: serverTimestamp(),
      });
      alert("Balance updated.");
      if (selectedUser) {
        selectUser(selectedUser.id);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update balance.");
    }
  };

  const deleteUser = async (id: string) => {
    if (!requireAdmin()) return;
    if (!confirm("This will permanently delete the user document (does NOT delete auth). Continue?")) return;
    try {
      const uRef = doc(db, "users", id);
      const snap = await getDoc(uRef);
      if (!snap.exists()) {
        alert("User not found");
        return;
      }
      const batch = writeBatch(db);
      // Archive into `deletedUsers` collection
      batch.set(doc(collection(db, "deletedUsers")), {
        originalId: id,
        data: snap.data(),
        deletedBy: currentUser?.uid,
        deletedAt: serverTimestamp(),
      } as DocumentData);
      batch.delete(uRef);
      await batch.commit();
      await addDoc(collection(db, "adminLogs"), {
        type: "delete-user",
        target: id,
        actor: currentUser?.uid,
        createdAt: serverTimestamp(),
      });
      alert("User deleted and archived.");
      setSelectedUser(null);
      setResults((r) => r.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete user.");
    }
  };

  const exportCSV = async () => {
    if (!requireAdmin()) return;
    try {
      setLogsLoading(true);
      // export current results (if any) else abort
      let rows: Array<any> = [];
      if (results.length) {
        rows = results.map((r) => ({ uid: r.id, ...(r.data || {}) }));
      } else {
        alert("No search results to export. Please run a search first.");
        setLogsLoading(false);
        return;
      }

      const header = Object.keys(rows[0]);
      const csv = [header.join(",")]
        .concat(rows.map((r) => header.map((h) => `"${String((r as any)[h] ?? "").replace(/"/g, '""')}"`).join(",")))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setLogsLoading(false);
    } catch (e) {
      console.error(e);
      setLogsLoading(false);
      alert("Export failed.");
    }
  };

  // UI
  if (loadingAuth) return <div className="p-8 text-white">Loading auth...</div>;
  if (!currentUser) return <div className="p-8 text-white">Please sign in.</div>;
  if (!isAdminUser)
    return <div className="p-8 text-white">You must be an admin to view this page.</div>;

  const totalBalance = (wallet: UserDoc['wallet']) => {
    if (!wallet) return 0;
    return (wallet.deposit || 0) + (wallet.winning || 0) + (wallet.bonus || 0);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>

      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2 bg-gray-800 border-gray-700 text-white"
          placeholder="Search by UID, name or phone..."
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
        />
        <button className="btn px-3 py-2 border rounded bg-gray-700 hover:bg-gray-600" onClick={() => setQueryText("")}>Clear</button>
        <button className="btn px-3 py-2 border rounded bg-blue-600 hover:bg-blue-500" onClick={exportCSV} disabled={logsLoading}>
          {logsLoading ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-gray-800/50 rounded p-4">
            <div className="text-gray-400 mb-2">Results ({results.length})</div>
            {searching ? (
              <div className="py-8 text-center">Searching...</div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center">No results</div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="py-2 px-2">Name</th>
                    <th className="px-2">Phone</th>
                    <th className="px-2">Balance</th>
                    <th className="px-2">Admin</th>
                    <th className="px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                      <td className="py-2 px-2">{r.data.inGameName ?? "—"}</td>
                      <td className="px-2">{r.data.phone ?? "—"}</td>
                      <td className="px-2">₹{totalBalance(r.data.wallet).toFixed(2)}</td>
                      <td className="px-2">{r.data.isAdmin ? "Yes" : "No"}</td>
                      <td className="px-2">
                        <button
                          className="px-2 py-1 text-xs border rounded bg-gray-700 hover:bg-gray-600"
                          onClick={() => selectUser(r.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-gray-800/50 rounded p-4 sticky top-6">
            <div className="text-gray-400 mb-2">Selected User</div>
            {selectedUser ? (
              <div>
                <div className="mb-2 font-semibold">{selectedUser.data.inGameName ?? selectedUser.id}</div>
                <div className="text-sm text-gray-400 break-all">UID: {selectedUser.id}</div>
                <div className="text-sm text-gray-400">Email: {selectedUser.data.email ?? "—"}</div>
                <div className="text-sm text-gray-400">Phone: {selectedUser.data.phone ?? "—"}</div>
                <div className="text-sm text-gray-400">Registered: {formatTime(selectedUser.data.registeredOn)}</div>
                <div className="text-sm text-gray-400">Balance: ₹{totalBalance(selectedUser.data.wallet).toFixed(2)}</div>
                <div className="text-sm text-gray-400 mb-3">Status: {selectedUser.data.suspended ? "Suspended" : "Active"}</div>

                <div className="flex flex-col gap-2 mt-4">
                  <button
                    className={`px-3 py-2 border rounded ${selectedUser.data.suspended ? 'bg-green-600 hover:bg-green-500' : 'bg-yellow-600 hover:bg-yellow-500'}`}
                    onClick={() => toggleSuspend(selectedUser.id, !!selectedUser.data.suspended)}
                  >
                    {selectedUser.data.suspended ? "Unsuspend User" : "Suspend User"}
                  </button>

                  <div className="flex gap-2 items-center mt-2">
                    <input
                      className="flex-1 border rounded px-2 py-1 bg-gray-700 border-gray-600"
                      placeholder="Amount (+/-)"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                    />
                    <button
                      className="px-3 py-2 border rounded bg-blue-600 hover:bg-blue-500"
                      onClick={() => {
                        const amt = parseFloat(adjustAmount);
                        if (Number.isNaN(amt) || amt === 0) return alert("Enter a valid non-zero number");
                        adjustBalance(selectedUser.id, amt);
                      }}
                    >
                      Apply
                    </button>
                  </div>

                  <button className="px-3 py-2 border rounded bg-red-600 text-white mt-4" onClick={() => deleteUser(selectedUser.id)}>
                    Delete & Archive User
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No user selected</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-gray-800/50 rounded p-4">
        <h3 className="font-semibold mb-2">Recent Admin Actions</h3>
        <RecentAdminLogs limit={10} />
      </div>
    </div>
  );
}

// ---------------------- RecentAdminLogs component ----------------------
function RecentAdminLogs({ limit: logLimit = 10 }: { limit?: number }) {
  const [logs, setLogs] = useState<Array<any>>([]);
  useEffect(() => {
    try {
      const logsQuery = query(collection(db, "adminLogs"), orderBy("createdAt", "desc"), limit(logLimit));
      const unsub = onSnapshot(logsQuery, (snap) => {
        const items: Array<any> = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
        setLogs(items);
      });
      return () => unsub();
    } catch (e) {
      console.error("logs failed", e);
    }
  }, [logLimit]);

  return (
    <div className="text-sm">
      {logs.length === 0 ? (
        <div className="text-gray-400">No logs yet.</div>
      ) : (
        <ul className="space-y-2">
          {logs.map((l) => (
            <li key={l.id} className="border rounded p-2 bg-black/20 border-gray-700">
              <div className="text-xs text-gray-400">{formatTime(l.createdAt)}</div>
              <div className="text-sm">{l.type} — target: {l.target} — actor: {l.actor}</div>
              <div className="text-xs text-gray-500">{l.value !== undefined ? `value: ${JSON.stringify(l.value)}` : ""} {l.newBalance !== undefined ? ` newBalance: ${l.newBalance}` : ""}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
