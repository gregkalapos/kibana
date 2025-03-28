/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';

import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ActionsClientChatVertexAI } from './chat_vertex';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { GeminiContent } from '@langchain/google-common';
import { FinishReason } from '@google/generative-ai';

const connectorId = 'mock-connector-id';

const mockExecute = jest.fn();
const actionsClient = actionsClientMock.create();

const mockLogger = loggerMock.create();

const mockStreamExecute = jest.fn().mockImplementation(() => {
  const passThrough = new PassThrough();

  // Write the data chunks to the stream
  setTimeout(() => {
    passThrough.write(
      Buffer.from(
        `data: {"candidates": [{"content": {"role": "model","parts": [{"text": "token1"}]}}],"modelVersion": "gemini-1.5-pro-001"}`
      )
    );
  });
  setTimeout(() => {
    passThrough.write(
      Buffer.from(
        `data: {"candidates": [{"content": {"role": "model","parts": [{"text": "token2"}]}}],"modelVersion": "gemini-1.5-pro-001"}`
      )
    );
  });
  setTimeout(() => {
    passThrough.write(
      Buffer.from(
        `data: {"candidates": [{"content": {"role": "model","parts": [{"text": "token3"}]}}],"modelVersion": "gemini-1.5-pro-001"}`
      )
    );
    // End the stream
    passThrough.end();
  });

  return {
    data: passThrough, // PassThrough stream will act as the async iterator
    status: 'ok',
  };
});

const mockStreamExecuteWithGoodStopEvents = jest.fn().mockImplementation(() => {
  const passThrough = new PassThrough();

  // Write the data chunks to the stream
  setTimeout(() => {
    passThrough.write(
      Buffer.from(
        `data: {"candidates": [{"content": {"role": "model","parts": [{"text": "token1"}]}}],"modelVersion": "gemini-1.5-pro-001"}`
      )
    );
  });
  setTimeout(() => {
    passThrough.write(
      Buffer.from(
        `data: {"candidates": [{"content": {"role": "model","parts": [{"text": "token2"}]}}],"modelVersion": "gemini-1.5-pro-001"}`
      )
    );
  });
  setTimeout(() => {
    passThrough.write(
      Buffer.from(
        `data: {"candidates": [{"content": {"role": "model","parts": [{"text": "token3"}]},"finishReason": "${FinishReason.STOP}","safetyRatings": [{"category": "HARM_CATEGORY_HATE_SPEECH","probability": "NEGLIGIBLE","probabilityScore": 0.060086742,"severity": "HARM_SEVERITY_NEGLIGIBLE","severityScore": 0.17106095},{"category": "HARM_CATEGORY_DANGEROUS_CONTENT","probability": "NEGLIGIBLE","probabilityScore": 0.16776322,"severity": "HARM_SEVERITY_LOW","severityScore": 0.37113687},{"category": "HARM_CATEGORY_HARASSMENT","probability": "NEGLIGIBLE","probabilityScore": 0.124212936,"severity": "HARM_SEVERITY_NEGLIGIBLE","severityScore": 0.17441037},{"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT","probability": "NEGLIGIBLE","probabilityScore": 0.05419875,"severity": "HARM_SEVERITY_NEGLIGIBLE","severityScore": 0.03461887}]}],"usageMetadata": {"promptTokenCount": 1062,"candidatesTokenCount": 15,"totalTokenCount": 1077},"modelVersion": "gemini-1.5-pro-002"}`
      )
    );
    // End the stream
    passThrough.end();
  });

  return {
    data: passThrough, // PassThrough stream will act as the async iterator
    status: 'ok',
  };
});

const mockStreamExecuteWithBadStopEvents = jest.fn().mockImplementation(() => {
  const passThrough = new PassThrough();

  // Write the data chunks to the stream
  setTimeout(() => {
    passThrough.write(
      Buffer.from(
        `data: {"candidates": [{"content": {"role": "model","parts": [{"text": "token1"}]}}],"modelVersion": "gemini-1.5-pro-001"}`
      )
    );
  });
  setTimeout(() => {
    passThrough.write(
      Buffer.from(
        `data: {"candidates": [{"content": {"role": "model","parts": [{"text": "token2"}]}}],"modelVersion": "gemini-1.5-pro-001"}`
      )
    );
  });
  setTimeout(() => {
    passThrough.write(
      Buffer.from(
        `data: {"candidates": [{"content": {"role": "model","parts": [{"text": "token3"}]},"finishReason": "${FinishReason.SAFETY}","safetyRatings": [{"category": "HARM_CATEGORY_HATE_SPEECH","probability": "NEGLIGIBLE","probabilityScore": 0.060086742,"severity": "HARM_SEVERITY_NEGLIGIBLE","severityScore": 0.17106095},{"category": "HARM_CATEGORY_DANGEROUS_CONTENT","probability": "HIGH","probabilityScore": 0.96776322,"severity": "HARM_SEVERITY_HIGH","severityScore": 0.97113687,"blocked":true},{"category": "HARM_CATEGORY_HARASSMENT","probability": "NEGLIGIBLE","probabilityScore": 0.124212936,"severity": "HARM_SEVERITY_NEGLIGIBLE","severityScore": 0.17441037},{"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT","probability": "NEGLIGIBLE","probabilityScore": 0.05419875,"severity": "HARM_SEVERITY_NEGLIGIBLE","severityScore": 0.03461887}]}],"usageMetadata": {"promptTokenCount": 1062,"candidatesTokenCount": 15,"totalTokenCount": 1077},"modelVersion": "gemini-1.5-pro-002"}`
      )
    );
    // End the stream
    passThrough.end();
  });

  return {
    data: passThrough, // PassThrough stream will act as the async iterator
    status: 'ok',
  };
});

const systemInstruction = 'Answer the following questions truthfully and as best you can.';

const callMessages = [
  new SystemMessage(systemInstruction),
  new HumanMessage('Question: Do you know my name?\n\n'),
] as unknown as BaseMessage[];

const callOptions = {
  stop: ['\n'],
  recursionLimit: 0,
  /** Maximum number of parallel calls to make. */
  maxConcurrency: 0,
};
const handleLLMNewToken = jest.fn();
const callRunManager = {
  handleLLMNewToken,
  handleCustomEvent: jest.fn().mockResolvedValue({}),
} as unknown as CallbackManagerForLLMRun;
const onFailedAttempt = jest.fn();
const defaultArgs = {
  actionsClient,
  connectorId,
  logger: mockLogger,
  streaming: false,
  maxRetries: 0,
  onFailedAttempt,
  convertSystemMessageToHumanContent: false,
};

const testMessage = 'Yes, your name is Andrew. How can I assist you further, Andrew?';

export const mockActionResponse = {
  candidates: [
    {
      content: {
        role: 'model',
        parts: [
          {
            text: testMessage,
          },
        ],
      },
      finishReason: 'STOP',
    },
  ],
  usageMetadata: { input_tokens: 4, output_tokens: 10, total_tokens: 14 },
};

describe('ActionsClientChatVertexAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    actionsClient.execute.mockImplementation(
      jest.fn().mockImplementation(() => ({
        data: mockActionResponse,
        status: 'ok',
      }))
    );
    mockExecute.mockImplementation(() => ({
      data: mockActionResponse,
      status: 'ok',
    }));
  });

  describe('_generate streaming: false', () => {
    it('returns the expected content when _generate is invoked', async () => {
      const actionsClientChatVertexAI = new ActionsClientChatVertexAI(defaultArgs);
      const result = await actionsClientChatVertexAI._generate(
        callMessages,
        callOptions,
        callRunManager
      );
      const subAction = actionsClient.execute.mock.calls[0][0].params.subAction;
      expect(subAction).toEqual('invokeAIRaw');

      expect(result.generations[0].text).toEqual(testMessage);
    });

    it('rejects with the expected error when the action result status is error', async () => {
      const hasErrorStatus = jest.fn().mockImplementation(() => {
        throw new Error(
          'ActionsClientChatVertexAI: action result status is error: action-result-message - action-result-service-message'
        );
      });

      actionsClient.execute.mockRejectedValueOnce(hasErrorStatus);

      const actionsClientChatVertexAI = new ActionsClientChatVertexAI({
        ...defaultArgs,
        actionsClient,
      });

      await expect(
        actionsClientChatVertexAI._generate(callMessages, callOptions, callRunManager)
      ).rejects.toThrowError();
      expect(onFailedAttempt).toHaveBeenCalled();
    });

    it('resolves to expected result when message has invalid content', async () => {
      actionsClient.execute.mockImplementation(
        jest.fn().mockResolvedValue({
          data: {
            Bad: true,
            finishReason: 'badness',
          },
          status: 'ok',
        })
      );

      const actionsClientChatVertexAI = new ActionsClientChatVertexAI(defaultArgs);

      await expect(
        actionsClientChatVertexAI._generate(callMessages, callOptions, callRunManager)
      ).resolves.toEqual({ generations: [], llmOutput: {} });
    });
  });

  describe('*_streamResponseChunks', () => {
    it('iterates over gemini chunks', async () => {
      actionsClient.execute.mockImplementationOnce(mockStreamExecute);

      const actionsClientChatVertexAI = new ActionsClientChatVertexAI({
        ...defaultArgs,
        actionsClient,
        streaming: true,
      });

      const gen = actionsClientChatVertexAI._streamResponseChunks(
        callMessages,
        callOptions,
        callRunManager
      );

      const chunks = [];

      for await (const chunk of gen) {
        chunks.push(chunk);
      }

      expect(chunks.map((c) => c.text)).toEqual(['token1', 'token2', 'token3']);
      expect(handleLLMNewToken).toHaveBeenCalledTimes(3);
      expect(handleLLMNewToken).toHaveBeenCalledWith('token1');
      expect(handleLLMNewToken).toHaveBeenCalledWith('token2');
      expect(handleLLMNewToken).toHaveBeenCalledWith('token3');
    });
    it('includes tokens from finishReason: STOP', async () => {
      actionsClient.execute.mockImplementationOnce(mockStreamExecuteWithGoodStopEvents);

      const actionsClientChatVertexAI = new ActionsClientChatVertexAI({
        ...defaultArgs,
        actionsClient,
        streaming: true,
      });

      const gen = actionsClientChatVertexAI._streamResponseChunks(
        callMessages,
        callOptions,
        callRunManager
      );

      const chunks = [];

      for await (const chunk of gen) {
        chunks.push(chunk);
      }

      expect(chunks.map((c) => c.text)).toEqual(['token1', 'token2', 'token3']);
      expect(handleLLMNewToken).toHaveBeenCalledTimes(3);
      expect(handleLLMNewToken).toHaveBeenCalledWith('token1');
      expect(handleLLMNewToken).toHaveBeenCalledWith('token2');
      expect(handleLLMNewToken).toHaveBeenCalledWith('token3');
    });
    it('throws an error on bad stop events', async () => {
      actionsClient.execute.mockImplementationOnce(mockStreamExecuteWithBadStopEvents);

      const actionsClientChatVertexAI = new ActionsClientChatVertexAI({
        ...defaultArgs,
        actionsClient,
        streaming: true,
      });

      const gen = actionsClientChatVertexAI._streamResponseChunks(
        callMessages,
        callOptions,
        callRunManager
      );

      const chunks = [];
      await expect(async () => {
        for await (const chunk of gen) {
          chunks.push(chunk);
        }
      }).rejects.toEqual(
        Error(
          `Gemini Utils: action result status is error. Candidate was blocked due to SAFETY - HARM_CATEGORY_DANGEROUS_CONTENT: HARM_SEVERITY_HIGH`
        )
      );
    });
  });

  describe('message formatting', () => {
    it('Properly sorts out the system role', async () => {
      const actionsClientChatVertexAI = new ActionsClientChatVertexAI(defaultArgs);

      await actionsClientChatVertexAI._generate(callMessages, callOptions, callRunManager);
      const params = actionsClient.execute.mock.calls[0][0].params.subActionParams as unknown as {
        messages: GeminiContent[];
        systemInstruction: string;
      };
      expect(params.messages.length).toEqual(1);
      expect(params.messages[0].parts.length).toEqual(1);
      expect(params.systemInstruction).toEqual(systemInstruction);
    });
    it('Handles 2 messages in a row from the same role', async () => {
      const actionsClientChatVertexAI = new ActionsClientChatVertexAI(defaultArgs);

      await actionsClientChatVertexAI._generate(
        [...callMessages, new HumanMessage('Oh boy, another')],
        callOptions,
        callRunManager
      );
      const { messages } = actionsClient.execute.mock.calls[0][0].params
        .subActionParams as unknown as { messages: GeminiContent[] };
      expect(messages.length).toEqual(1);
      expect(messages[0].parts.length).toEqual(2);
    });
  });
});
