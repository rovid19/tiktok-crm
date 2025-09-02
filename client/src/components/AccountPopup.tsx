import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { X, Plus, User, Lock, Globe, Edit } from "lucide-react";
import type { Account, AccountFormData } from "../Types";

interface AccountPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded: () => void;
  accountId: string;
  setAccountId: (accountId: string) => void;
  accounts: Account[];
}

const AccountPopup = ({
  isOpen,
  onClose,
  onAccountAdded,
  accountId,
  setAccountId,
  accounts,
}: AccountPopupProps) => {
  const [formData, setFormData] = useState<AccountFormData>({
    email: "",
    password: "",
    proxy: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (field: keyof AccountFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("handleSubmit");
    e.preventDefault();
    console.log(accountId);
    if (!accountId) {
      if (!formData.email || !formData.password) {
        setError("Please fill in all required fields");
        return;
      }
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${
          accountId
            ? `http://127.0.0.1:8000/accounts/update/${accountId}`
            : "http://127.0.0.1:8000/accounts/add"
        }`,
        {
          method: accountId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("Account added successfully:", result);

        // Reset form
        setFormData({
          email: "",
          password: "",
          proxy: "",
        });

        // Close popup and refresh accounts list
        onAccountAdded();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.msg || "Failed to add account");
      }
    } catch (err) {
      console.error("Error adding account:", err);
      setError("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetCookies = async (accountId: string) => {
    const response = await fetch(
      `http://127.0.0.1:8000/accounts/${accountId}/fetch_cookies`,
      {
        method: "POST",
      }
    );
    const data = await response.json();
    console.log(data);
  };

  useEffect(() => {
    if (accountId) {
      const existingAccount = accounts.find(
        (acc: Account) => acc.id === accountId
      );
      if (existingAccount) {
        setFormData({
          email: existingAccount.email,
          password: existingAccount.password,
          proxy: existingAccount.proxy,
        });
      }
    }
  }, [accounts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md bg-gray-900 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Add New Account</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onClose();
              setAccountId("");
            }}
            className="cursor-pointer h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={(e: React.FormEvent) => {
              console.log("handleSubmit");
              handleSubmit(e);
            }}
            className="space-y-4"
          >
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("email", e.target.value)
                  }
                  className="pl-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("password", e.target.value)
                  }
                  className="pl-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                  placeholder="Enter password"
                />
              </div>
            </div>

            {/* Proxy Field (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="proxy" className="text-white">
                Proxy (Optional)
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="proxy"
                  type="text"
                  value={formData.proxy}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("proxy", e.target.value)
                  }
                  className="pl-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                  placeholder="Enter proxy (optional)"
                />
              </div>
            </div>

            {/* SetCookies */}
            <div className="space-y-2">
              <Label htmlFor="setCookies" className="text-white">
                Set Cookies
              </Label>
              <Button
                type="button"
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white cursor-pointer"
                disabled={isLoading}
                onClick={() => {
                  handleSetCookies(accountId);
                }}
              >
                Set Cookies
              </Button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-md border border-red-700">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {accountId ? "Editing..." : "Adding..."}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {accountId ? (
                      <Edit className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {accountId ? "Edit Account" : "Add Account"}
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountPopup;
