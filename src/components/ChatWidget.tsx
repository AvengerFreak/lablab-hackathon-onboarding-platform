import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, X, Bot, Sparkles } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  { label: "Get AMD Credits", text: "How do I claim my AMD AI Developer credits?" },
  { label: "Claim Fireworks Code", text: "How do I get my Fireworks API promo code?" },
  { label: "GitHub Setup", text: "When will our team GitHub repository be ready?" },
  { label: "Join Discord", text: "How do I join the Discord servers?" },
  { label: "Submit Project", text: "How do we submit our hackathon project?" },
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      sender: "bot",
      text: "Hi! I am your LabLab Hackathon Assistant. Ask me anything about claiming AMD credits, Fireworks codes, joining Discord/GitHub, or submitting your project!",
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current?.scrollIntoView) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  function getBotResponse(userText: string): string {
    const text = userText.toLowerCase();

    if (text.includes("amd") || text.includes("credit") || text.includes("gpu")) {
      return "To claim your AMD AI Developer credits, go to Step 1 in your Onboarding Wizard checklist. Click on the link to sign up at the AMD portal using your hackathon email.";
    }
    if (text.includes("fireworks") || text.includes("promo") || text.includes("code")) {
      return "Claim your Fireworks API promo code in Step 2 of the Onboarding Wizard. Copy the promo code displayed there and apply it in your Fireworks AI billing console.";
    }
    if (text.includes("github") || text.includes("repo") || text.includes("git")) {
      return "Your team's GitHub repository (Step 6) will be created automatically once ALL team members have completed their onboarding checklist steps.";
    }
    if (text.includes("discord") || text.includes("server") || text.includes("invite")) {
      return "Step 4 guides you to join the main LabLab Discord server for support, and Step 5 connects you to your team's auto-generated Discord server channel.";
    }
    if (text.includes("submit") || text.includes("project")) {
      return "Once all checklist steps are completed and team infrastructure is active, the Team Lead will see a 'Submit Project' button inside the Team Details view. Click it to finalize your submission.";
    }
    if (text.includes("leave") || text.includes("team")) {
      return "If you are not the Team Lead, you can click on the Team Details card in your onboarding dashboard and select 'Leave Team'. Team Leads cannot leave their own team without disbanding it.";
    }
    if (text.includes("mentor") || text.includes("help")) {
      return "If a mentor is assigned to your team, their contact info and Discord tag will be displayed in the Team Details panel. You can also request help in the LabLab Discord support channels.";
    }
    if (text.includes("hello") || text.includes("hi ") || text.includes("hey")) {
      return "Hello! How can I help you with your hackathon onboarding today?";
    }

    return "I'm sorry, I don't have a direct answer for that. You can ask me about AMD credits, Fireworks promo codes, GitHub repository setup, Discord channels, leaving a team, or project submission. How can I guide you?";
  }

  function handleSend(textToSend: string) {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate natural AI thinking delay
    setTimeout(() => {
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: getBotResponse(textToSend),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 750);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* ── Chatbox Card ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="AI Chatbot Assistant"
          className="absolute bottom-16 right-0 w-[350px] sm:w-[380px] h-[520px] rounded-2xl border border-border bg-background/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ease-out"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-accent to-accent/80 px-4 py-3 flex items-center justify-between text-background shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-background/15 border border-background/25 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-background" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-wide">LabLab Assistant</h3>
                <p className="text-[10px] opacity-75 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-background/10 transition-colors cursor-pointer"
              aria-label="Close assistant panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                    msg.sender === "user"
                      ? "bg-accent/15 text-accent border border-accent/20"
                      : "bg-muted border border-border/40 text-foreground/80"
                  }`}
                  aria-hidden="true"
                >
                  {msg.sender === "user" ? "U" : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div
                  className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-accent text-background rounded-tr-none font-medium"
                      : "bg-muted border border-border/40 text-foreground rounded-tl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 max-w-[85%]">
                <div
                  className="w-6 h-6 rounded-full bg-muted border border-border/40 flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  <Bot className="w-3.5 h-3.5 text-foreground/80" />
                </div>
                <div
                  className="bg-muted border border-border/40 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1 shrink-0"
                  aria-label="AI is typing"
                >
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions Layer */}
          <div className="px-4 py-2.5 border-t border-border bg-background shrink-0 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => handleSend(q.text)}
                className="text-xs bg-muted hover:bg-muted/80 border border-border/60 hover:border-border text-foreground/70 hover:text-foreground px-2.5 py-1.5 rounded-full transition-all cursor-pointer inline-block shrink-0"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Form Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="p-3 border-t border-border bg-background flex gap-2 shrink-0 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-muted border border-border/60 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
              aria-label="User query input"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-9 h-9 rounded-xl bg-accent text-background flex items-center justify-center hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ── Floating Toggle Button ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-accent text-background shadow-lg hover:scale-105 active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border-0"
        aria-label={isOpen ? "Close chatbot pane" : "Open chatbot pane"}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}
