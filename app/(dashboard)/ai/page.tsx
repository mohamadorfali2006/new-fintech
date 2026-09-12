"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Trash2,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  LogIn,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const EXAMPLE_PROMPTS = [
  "How much did I spend on food this month?",
  "What are my top 3 expense categories?",
  "Did my spending increase recently?",
  "Which recurring subscriptions do I have?",
  "How much can I save each month?",
  "Am I currently over budget anywhere?",
];

export default function AiAssistantPage() {
  const t = useTranslations();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check user session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.status === 401) {
          setIsAuthorized(false);
        } else if (res.ok) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(true);
        }
      } catch (err) {
        setIsAuthorized(false);
      }
    }
    checkAuth();
  }, []);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hello! I am your AI Financial Assistant. I can analyze your transactions, summarize category spending, detect recurring subscriptions, and highlight potential savings. Ask me anything or select one of the suggested prompts below!",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  async function handleSendMessage(textToSend?: string) {
    const text = (textToSend || inputMessage).trim();
    if (!text || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);
    setError("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-4).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.status === 401) {
        setIsAuthorized(false);
        throw new Error(t("ai.unauthorized"));
      }

      if (!res.ok) {
        throw new Error(t("ai.error"));
      }

      const data = await res.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || data.response || "No response received",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || t("ai.error"));
    } finally {
      setIsTyping(false);
    }
  }

  function handleClearChat() {
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        content: "Conversation cleared. What else would you like to explore about your finances?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }

  // If unauthorized state
  if (isAuthorized === false) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="bg-gray-50 dark:bg-gray-800/50 border-amber-200 dark:border-amber-900/50 text-center p-8">
          <CardContent className="space-y-4">
            <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t("ai.unauthorized")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Please log in to your account to allow the AI assistant to securely analyze your personal financial records.
            </p>
            <div className="pt-2">
              <Button onClick={() => (window.location.href = "/login")}>
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-10rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            {t("ai.title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {t("ai.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleClearChat}>
            <Trash2 className="h-4 w-4 mr-1.5" />
            {t("ai.clearChat")}
          </Button>
        </div>
      </div>

      {/* Main Chat Container */}
      <Card className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-800/50">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm ${
                    isUser
                      ? "bg-indigo-600 text-white"
                      : "bg-gradient-to-tr from-indigo-500 to-purple-600 text-white"
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm shadow-sm ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/80 rounded-tl-none"
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed space-y-2">
                    {msg.content}
                  </div>
                  <div
                    className={`text-[10px] mt-2 font-medium ${
                      isUser ? "text-indigo-200 text-right" : "text-gray-400 text-left"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs shrink-0 shadow-sm">
                <Bot className="h-4 w-4 animate-spin" />
              </div>
              <div className="bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-none p-4 text-sm shadow-sm flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                </span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("ai.typing")}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 border border-red-200 dark:border-red-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700/80 bg-white/50 dark:bg-gray-800/30 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-xs text-gray-400 font-medium mr-1 flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5" />
              Suggestions:
            </span>
            {EXAMPLE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isTyping}
                className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t("ai.placeholder")}
              disabled={isTyping}
              className="flex-1"
            />
            <Button type="submit" disabled={!inputMessage.trim() || isTyping}>
              <Send className="h-4 w-4 mr-1.5" />
              {t("ai.send")}
            </Button>
          </form>

          {/* Disclaimer */}
          <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-2.5">
            {t("ai.aiDisclaimer")}
          </p>
        </div>
      </Card>
    </div>
  );
}
