import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Users, Plus, Play, Pause } from "lucide-react";
import AccountList from "./AccountList";
import AccountPopup from "./AccountPopup";
import type { Account } from "../Types";

const Dashboard = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isAccountPopupOpen, setIsAccountPopupOpen] = useState(false);
  const [fetchData, setFetchData] = useState(true);
  const [accountId, setAccountId] = useState<string>("");
  const runningAccounts = accounts.filter(
    (account) => account.status === "running"
  ).length;

  const handleGenerateTodaySessions = async () => {
    const response = await fetch(
      "http://localhost:3000/api/accounts/generate-today-sessions",
      {
        method: "POST",
      }
    );
    if (response.ok) {
      setFetchData(true);
    }
  };
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {isAccountPopupOpen && (
        <AccountPopup
          isOpen={isAccountPopupOpen}
          onClose={() => setIsAccountPopupOpen(false)}
          onAccountAdded={() => {
            setFetchData(true);
          }}
          accountId={accountId}
          setAccountId={setAccountId}
          accounts={accounts}
        />
      )}
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Account Management</h1>
          <p className="text-gray-300">
            Manage your TikTok accounts and monitor their status.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
          <Card className="bg-gray-900 border-gray-700/70">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">
                Total Accounts
              </CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {accounts.length}
              </div>
              <p className="text-xs text-gray-400">Total accounts added</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700/70">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">
                Running Accounts
              </CardTitle>
              <Play className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {runningAccounts}
              </div>
              <p className="text-xs text-gray-400">Currently active</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700/70">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">
                Inactive Accounts
              </CardTitle>
              <Pause className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-400">
                {accounts.length - runningAccounts}
              </div>
              <p className="text-xs text-gray-400">Currently paused</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Account Button */}
        <div className="flex items-center gap-2">
          <div className="mb-6">
            <Button
              onClick={() => {
                setIsAccountPopupOpen(true);
              }}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 cursor-pointer border border-gray-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Add New Account
            </Button>
          </div>

          {/* Generate Today's Sessions Button */}
          <div className="mb-6">
            <Button
              onClick={handleGenerateTodaySessions}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 cursor-pointer border border-gray-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Generate Today's Sessions
            </Button>
          </div>
        </div>

        {/* Accounts List */}
        <AccountList
          accounts={accounts}
          setAccounts={setAccounts}
          fetchData={fetchData}
          setFetchData={setFetchData}
          setAccountId={setAccountId}
          setIsAccountPopupOpen={setIsAccountPopupOpen}
        />
      </div>
    </div>
  );
};

export default Dashboard;
