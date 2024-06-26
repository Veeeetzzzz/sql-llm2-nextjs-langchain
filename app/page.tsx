"use client";
import { useState, useEffect } from 'react';
import { ChatWindow } from "@/components/ChatWindow";

export default function Home() {
  const [dbConnected, setDbConnected] = useState(false);

useEffect(() => {
  const verifyConnection = async () => {
    try {
      const response = await fetch('/api/checkDbConnection');
      const data = await response.json();
      setDbConnected(data.connected);
    } catch (error) {
      console.error('Error verifying database connection:', error);
      setDbConnected(false);
    }
  };

  verifyConnection();
}, []);

  const DatabaseStatusIndicator = (
    <div className={`flex items-center ${dbConnected ? 'text-green-500' : 'text-red-500'}`}>
      <span className="material-icons">{dbConnected ? '🟢' : '❌'}</span>
      <span className="ml-2">{dbConnected ? 'Database Connected' : 'Database Not Connected - Check /api/checkDbConnection.js'}</span>
    </div>
  );

  const InfoCard = (
    <div className="p-4 md:p-8 rounded bg-[#25252d] w-full max-h-[85%] overflow-hidden">
      <h1 className="text-3xl md:text-4xl mb-4">
        ▲ Next.js + LangChain.js 🦜🔗 {DatabaseStatusIndicator}
      </h1>
      <ul>
        <li className="text-l">
          🌐
          <span className="ml-2">
            Welcome to the Natural Language SQL Chat Tool. Powered by{" "}
            <a href="https://js.langchain.com/" target="_blank">
              LangChain.js
            </a>{" "}
            and hosted on{" "}
            <a href="https://vercel.com/" target="_blank">
              Vercel
            </a>.
          </span>
        </li>
        <li className="text-l">
          💡
          <span className="ml-2">
            Easily query your database using natural language. The interface
            communicates with the SQL database, providing intuitive and
            efficient data access.
          </span>
        </li>
        <li className="text-l">
          📚
          <span className="ml-2">
            Find the source code and deploy your own version from our{" "}
            <a
              href="https://github.com/Veeeetzzzz/sql-llm2-nextjs-langchain/tree/main"
              target="_blank"
            >
              GitHub repository
            </a>
            .
          </span>
        </li>
        <li className="text-l">
          👇
          <span className="ml-2">
            Try asking a SQL query in natural language below, like <code>What are the sales figures for this quarter?</code>
          </span>
        </li>
      </ul>
    </div>
  );

  return (
    <ChatWindow
      endpoint="api/chat"
      emoji="🌐"
      titleText="SQL Chat Assistant"
      placeholder="Ask me SQL queries in natural language!"
      emptyStateComponent={InfoCard}
    ></ChatWindow>
  );
}
