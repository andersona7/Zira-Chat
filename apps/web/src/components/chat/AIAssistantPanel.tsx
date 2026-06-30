import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, Send, Bot, User, CornerDownLeft } from 'lucide-react';
import { IconButton } from '@zira/ui';

interface AIAssistantPanelProps {
  onClose: () => void;
  chatName?: string;
}

interface AIMessage {
  id: string;
  sender: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  onClose,
  chatName,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      content: `Hello! I'm your AI Workspace Assistant. How can I help you analyze or summarize the conversation with ${chatName || 'this contact'}?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: AIMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      let aiContent = '';
      const prompt = userMsg.content.toLowerCase();

      if (prompt.includes('summarize') || prompt.includes('summary')) {
        aiContent = `Based on the recent thread, the conversation revolves around aligning the design system guidelines (Aether guidelines) and finishing the side panels resizing layout. The user requested non-overlapping panels and smooth animations.`;
      } else if (prompt.includes('action') || prompt.includes('todo')) {
        aiContent = `Here are the active action items identified in this chat:\n1. Refactor side panels to inline width transitions.\n2. Fix composer emoji/GIF and audio recording behaviors.\n3. Integrate responsive styles for desktop/mobile views.`;
      } else {
        aiContent = `I've analyzed your query: "${userMsg.content}". Let me know if you would like me to summarize the highlights, extract action items, or draft a reply for this conversation.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          content: aiContent,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border w-full relative">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 bg-surface/80 glass border-b border-border h-[60px] shrink-0">
        <IconButton label="Close panel" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </IconButton>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-500 animate-pulse" />
          <h2 className="text-lg font-semibold text-text-primary">AI Assistant</h2>
        </div>
      </header>

      {/* Message Flow */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
        {messages.map((msg) => {
          const isAI = msg.sender === 'ai';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${
                isAI ? 'self-start' : 'self-end flex-row-reverse ml-auto'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
                  isAI
                    ? 'bg-primary-500/10 text-primary-500 border-primary-500/20'
                    : 'bg-accent/10 text-accent border-accent/20'
                }`}
              >
                {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div
                className={`p-3.5 rounded-2xl text-sm leading-relaxed border ${
                  isAI
                    ? 'bg-background text-text-primary border-border/60 rounded-tl-sm'
                    : 'bg-primary-500 text-white border-transparent rounded-tr-sm'
                }`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>
                <span
                  className={`text-[9px] mt-1.5 block text-right ${
                    isAI ? 'text-text-muted' : 'text-white/60'
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-3 max-w-[80%] self-start">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary-500/10 text-primary-500 border border-primary-500/20 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-background text-text-primary border border-border/60 rounded-2xl rounded-tl-sm p-4 flex items-center gap-1">
              <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSend}
        className="p-4 border-t border-border bg-background/50 shrink-0"
      >
        <div className="relative flex items-center bg-surface border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary-500/20 transition-all overflow-hidden pr-2.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI to summarize, draft replies..."
            className="w-full h-11 pl-4 pr-12 text-sm text-text-primary placeholder:text-text-muted/70 bg-transparent focus:outline-none"
            disabled={isTyping}
          />
          <IconButton
            label="Send prompt"
            type="submit"
            disabled={!input.trim() || isTyping}
            className={`w-8 h-8 rounded-lg shrink-0 ${
              input.trim() && !isTyping
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-surface-hover text-text-muted'
            }`}
          >
            <Send className="w-4 h-4" />
          </IconButton>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-text-muted mt-2 justify-center">
          <span>AI outputs may be inaccurate. Press Enter</span>
          <CornerDownLeft className="w-2.5 h-2.5" />
          <span>to submit.</span>
        </div>
      </form>
    </div>
  );
};
