import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Play, Edit, Users, Pause, Trash2, Globe } from "lucide-react";
import { Button } from "./ui/button";
import type { Account } from "../Types";

interface AccountListProps {
  accounts: Account[];
  setAccounts: (accounts: Account[]) => void;
  fetchData: boolean;
  setFetchData: (fetchData: boolean) => void;
  setAccountId: (accountId: string) => void;
  setIsAccountPopupOpen: (isAccountPopupOpen: boolean) => void;
}

const AccountList = ({
  accounts,
  setAccounts,
  fetchData,
  setFetchData,
  setAccountId,
  setIsAccountPopupOpen,
}: AccountListProps) => {
  useEffect(() => {
    if (fetchData) {
      const fetchAccounts = async () => {
        try {
          const response = await fetch("http://127.0.0.1:8000/accounts");
          const data = await response.json();
          console.log(data);
          setAccounts(data);
          setFetchData(false);
        } catch (error) {
          console.error("Failed to fetch accounts:", error);
        }
      };
      fetchAccounts();
    }
  }, [setAccounts, fetchData]);

  const handleDeleteAccount = async (id: string) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/accounts/delete/${id}`,
        {
          method: "DELETE",
        }
      );
      if (response.ok) {
        setAccounts(accounts.filter((account) => account.id !== id));
        setFetchData(true);
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
    }
    setFetchData(true);
  };

  const handleRunScraper = async (id: string) => {
    console.log("Running scraper for account:", id);
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/accounts/${id}/run_scraper`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        // FastAPI returns {"detail": {...}}
        if (errorData.detail?.error) {
          alert(
            `Error: ${errorData.detail.error} - ${errorData.detail.message}`
          );
        } else {
          alert(`Unexpected error: ${JSON.stringify(errorData)}`);
        }
        return;
      }

      // success
      const data = await response.json();
      console.log("Scraper started:", data);
      setFetchData(true);
    } catch (error) {
      alert(`Network error running scraper: ${error}`);
      console.error("Failed to run scraper:", error);
    }
  };

  const handleValidateAccount = async (id: string) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/accounts/${id}/launch_profile`,
        {
          method: "POST",
        }
      );
      if (response.ok) {
        setFetchData(true);
      }
    } catch (error) {
      console.error("Failed to validate account:", error);
    }
    setFetchData(true);
  };
  return (
    <div>
      <Card className="bg-gray-900 border-gray-700/70">
        <CardHeader>
          <CardTitle className="text-white">Accounts</CardTitle>
          <CardDescription className="text-gray-400">
            Manage your TikTok accounts and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-white">{account.email}</h3>
                    <p className="text-sm text-gray-400">
                      Proxy: {account.proxy} • Path:{" "}
                      {account.chrome_profile_path}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Badge
                    variant={
                      account.status === "running" ? "default" : "secondary"
                    }
                    className={
                      account.status === "running"
                        ? "bg-green-600 text-white cursor-pointer"
                        : account.status === "cookies expired"
                        ? "bg-yellow-500 text-white cursor-pointer"
                        : account.status === "curl failed"
                        ? "bg-red-500 text-white cursor-pointer"
                        : "bg-gray-900 text-gray-200 cursor-pointer"
                    }
                  >
                    {account.status === "running"
                      ? "Running"
                      : account.status === "cookies expired"
                      ? "Cookies Expired"
                      : account.status === "curl failed"
                      ? "Curl Failed"
                      : "Not Running"}
                  </Badge>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleValidateAccount(account.id)}
                    className="h-8 px-3 border-gray-600 bg-gray-900 text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    <Globe /> Open Chrome Profile
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunScraper(account.id)}
                    className="h-8 px-3 border-gray-600 bg-gray-900 text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    {account.status === "running" ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAccountId(account.id);
                      setIsAccountPopupOpen(true);
                    }}
                    className="h-8 px-3 border-gray-600 bg-gray-900 text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteAccount(account.id)}
                    className="h-8 px-3 bg-gray-900 text-red-400 hover:text-red-300 hover:bg-red-900/20 hover:text-white border-red-700 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {accounts.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No accounts added yet</p>
                <p className="text-sm">
                  Click "Add New Account" to get started
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountList;
