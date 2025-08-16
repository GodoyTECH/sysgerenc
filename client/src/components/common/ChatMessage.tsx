import React from "react";

interface ChatMessageProps {
  user: string;
  message: string;
}

export default function ChatMessage({ user, message }: ChatMessageProps) {
  return (
    <div className="p-2 border-b border-gray-200">
      <strong>{user}:</strong> <span>{message}</span>
    </div>
  );
}

