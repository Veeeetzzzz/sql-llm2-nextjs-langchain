import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage, StreamingTextResponse } from "ai";

import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { HttpResponseOutputParser } from "langchain/output_parsers";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";
import { SqlToolkit } from "langchain/agents/toolkits/sql";
import { AIMessage } from "langchain/schema";
import { SqlDatabase } from "langchain/sql_db";
//import { DataSource } from "mysql";
import { connect } from "@planetscale/database";
import { PlanetScaleDialect } from "langchain/sql_db";

try {
  // Connect to the PlanetScale database
  const connection = connect({
    url: dbConnectionString,
  });

  // Create an instance of SqlDatabase using PlanetScaleDialect
  const db = await PlanetScaleDialect.fromConnection(connection);

  // ...
} catch (error) {
  console.error("Error connecting to the database:", error);
  return NextResponse.json(
    { error: "Failed to connect to the database" },
    { status: 500 }
  );
}

export const runtime = "edge";

const formatMessage = (message: VercelChatMessage) => {
  return `${message.role}: ${message.content}`;
};

const TEMPLATE = `You are a pirate named Patchy. All responses must be extremely verbose and in pirate dialect.

Current conversation:
{chat_history}

User: {input}
AI:`;

/**
 * This handler initializes and calls a simple chain with a prompt,
 * chat model, and output parser. See the docs for more information:
 *
 * https://js.langchain.com/docs/guides/expression_language/cookbook#prompttemplate--llm--outputparser
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
    const currentMessageContent = messages[messages.length - 1].content;
    const prompt = PromptTemplate.fromTemplate(TEMPLATE);

    const dbConnectionString = body.dbConnectionString;
    let db;

    try {
      // Connect to the PlanetScale database
      db = connect({
        url: dbConnectionString,
      });
    } catch (error) {
      console.error("Error connecting to the database:", error);
      return NextResponse.json(
        { error: "Failed to connect to the database" },
        { status: 500 }
      );
    }

    const model = new ChatOpenAI({
      temperature: 0.8,
      modelName: "gpt-3.5-turbo-1106",
    });

    const outputParser = new HttpResponseOutputParser();

    const sqlToolKit = new SqlToolkit(db, model);
    const tools = sqlToolKit.getTools();
    const SQL_PREFIX = `You are an agent designed to interact with a SQL database.
Given an input question, create a syntactically correct {dialect} query to run, then look at the results of the query and return the answer.
Unless the user specifies a specific number of examples they wish to obtain, always limit your query to at most {top_k} results using the LIMIT clause.
You can order the results by a relevant column to return the most interesting examples in the database.
Never query for all the columns from a specific table, only ask for a the few relevant columns given the question.
You have access to tools for interacting with the database.
Only use the below tools.
Only use the information returned by the below tools to construct your final answer.
You MUST double check your query before executing it. If you get an error while executing a query, rewrite the query and try again.

DO NOT make any DML statements (INSERT, UPDATE, DELETE, DROP etc.) to the database.

If the question does not seem related to the database, just return "I don't know" as the answer.`;
    const SQL_SUFFIX = `Begin!

Question: {input}
Thought: I should look at the tables in the database to see what I can query.
{agent_scratchpad}`;

    const sqlPrompt = ChatPromptTemplate.fromMessages([
      ["system", SQL_PREFIX],
      HumanMessagePromptTemplate.fromTemplate("{input}"),
      new AIMessage(SQL_SUFFIX.replace("{agent_scratchpad}", "")),
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const newPrompt = await sqlPrompt.partial({
      dialect: sqlToolKit.dialect,
      top_k: "10",
    });

    const runnableAgent = await createOpenAIToolsAgent({
      llm: model,
      tools,
      prompt: newPrompt,
    });

    const agentExecutor = new AgentExecutor({
      agent: runnableAgent,
      tools,
    });

    const result = await agentExecutor.invoke({
      input: currentMessageContent,
    });

    const stream = await chain.stream({
      chat_history: formattedPreviousMessages.join("\n"),
      input: result.output,
    });

    return new StreamingTextResponse(stream);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
