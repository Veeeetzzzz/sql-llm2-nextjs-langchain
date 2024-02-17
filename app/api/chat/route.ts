import { NextRequest, NextResponse } from "next/server";
import { appDataSource } from "../checkDbConnection";
import { SqlDatabase } from "langchain/sql_db";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { createSqlAgent, SqlToolkit } from "langchain/agents/toolkits/sql";

//export const runtime = "edge";

async function handleRequest(req) {
  const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: appDataSource, //
  });

  const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
  });

  const toolkit = new SqlToolkit(db, model);
  const executor = createSqlAgent(model, toolkit);

  
  const body = await req.json();
  const input = body.question; // 

  
  const result = await executor.invoke({ input });

  return new NextResponse(JSON.stringify({
    question: input,
    response: result.output,
    details: result.intermediateSteps,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

export default async req => {
  if (req.method === 'POST') {
    return handleRequest(req);
  } else {
    return new NextResponse(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { "Content-Type": "application/json" } });
  }
};
