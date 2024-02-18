import { appDataSource } from "../checkDbConnection";
//import appDataSource from '../checkDbConnection';
import { SqlDatabase } from "langchain/sql_db";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Initialize the LLM (Language Model) with ChatOpenAI
const llm = new ChatOpenAI();

// Initialize SQL Database from appDataSource
// Assuming appDataSource setup is compatible with SqlDatabase.fromDataSourceParams
const db = await SqlDatabase.fromDataSourceParams({
  appDataSource: appDataSource,
});

// Define prompt for generating SQL query
const prompt = PromptTemplate.fromTemplate(`
  Based on the provided SQL table schema below, write a SQL query that would answer the user's question.
  ------------
  SCHEMA: {schema}
  ------------
  QUESTION: {question}
  ------------
  SQL QUERY:`);

// Define the runnable sequence for generating SQL query
const sqlQueryChain = RunnableSequence.from([
  {
    schema: async () => db.getTableInfo(),
    question: (input: { question: string }) => input.question,
  },
  prompt,
  llm.bind({ stop: ["\nSQLResult:"] }),
  new StringOutputParser(),
]);

// Execute SQL query chain
// Replace question with reference to user input
const res = await sqlQueryChain.invoke({
  question: "How many employees are there?",
});
console.log({ res });

// Define prompt for generating natural language response
const finalResponsePrompt = PromptTemplate.fromTemplate(`
  Based on the table schema below, question, SQL query, and SQL response, write a natural language response:
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

// Define the final runnable sequence for generating natural language response
const finalChain = RunnableSequence.from([
  {
    question: (input) => input.question,
    query: sqlQueryChain,
  },
  {
    schema: async () => db.getTableInfo(),
    question: (input) => input.question,
    query: (input) => input.query,
    response: (input) => db.run(input.query), // db.run() depends on actual implementation in SqlDatabase from langchain
  },
  finalResponsePrompt,
  llm,
  new StringOutputParser(),
]);

// Execute the final response chain
const finalResponse = await finalChain.invoke({
  question: "How many employees are there?",
});
console.log({ finalResponse });
