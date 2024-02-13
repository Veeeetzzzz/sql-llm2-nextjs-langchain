import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage, StreamingTextResponse } from "ai";
import { appDataSource } from "../checkDbConnection";
import { DataSource } from "typeorm";
import { SqlDatabase } from "langchain/sql_db";
import { PromptTemplate } from "langchain/prompts";
import { RunnableSequence } from "langchain/schema/runnable";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { StringOutputParser } from "langchain/schema/output_parser";

export const runtime = "edge";

const db = await SqlDatabase.fromDataSourceParams({
  appDataSource: appDataSource,
});


const llm = new ChatOpenAI({
  modelName: "gpt-3.5-turbo", // Adjust model name as necessary
});

const schemaPromptTemplate = PromptTemplate.fromTemplate(`Based on the provided SQL table schema below, write a SQL query that would answer the user's question.
------------
SCHEMA: {schema}
------------
QUESTION: {question}
------------
SQL QUERY:`);

const responsePromptTemplate = PromptTemplate.fromTemplate(`Based on the table schema below, question, SQL query, and SQL response, write a natural language response:
------------
SCHEMA: {schema}
------------
QUESTION: {question}
------------
SQL QUERY: {query}
------------
SQL RESPONSE: {response}
------------
NATURAL LANGUAGE RESPONSE:`);

const sqlQueryChain = RunnableSequence.from([
  {
    schema: async () => db.getTableInfo(),
    question: (input) => input.question,
  },
  schemaPromptTemplate,
  llm.bind({ stop: ["\nSQLResult:"] }),
  new StringOutputParser(),
]);

const finalChain = RunnableSequence.from([
  {
    schema: async () => db.getTableInfo(),
    question: (input) => input.question,
    query: async (input) => {
      const res = await sqlQueryChain.invoke({ question: input.question });
      return res;
    },
    response: async (input) => {
      const queryResult = await db.run(input.query);
      return queryResult;
    },
  },
  responsePromptTemplate,
  llm,
  new StringOutputParser(),
]);

const formatMessage = (message) => `${message.role}: ${message.content}`;

const TEMPLATE = `You are an helpful SQL tool designed to produce only the output required for the task.

Current conversation:
{chat_history}

User: {input}
AI:`;

export async function POST(req) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
    const currentMessageContent = messages[messages.length - 1].content;
    const prompt = PromptTemplate.fromTemplate(TEMPLATE);

    const model = new ChatOpenAI({
      temperature: 0.8,
      modelName: "gpt-3.5-turbo-1106",
    });

    const outputParser = new HttpResponseOutputParser();

    const chain = prompt.pipe(model).pipe(outputParser);

    const stream = await chain.stream({
      chat_history: formattedPreviousMessages.join("\n"),
      input: currentMessageContent,
    });

    return new StreamingTextResponse(stream);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
