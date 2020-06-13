/*!
 *
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import Context from '@/trace/context/Context';
import { Component } from '@/trace/Component';
import Tag from '@/Tag';
import Log from '@/Log';
import Segment from '@/trace/context/Segment';
import { ContextCarrier } from '@/trace/context/Carrier';
import ID from '@/trace/ID';
import SegmentRef from '@/trace/context/SegmentRef';
import { SpanLayer, SpanType } from '@/proto/language-agent/Tracing_pb';

export type SpanCtorOptions = {
  context: Context;
  operation: string;
  id?: number;
  parentId?: number;
  peer?: string;
  layer?: SpanLayer;
  component?: Component;
};

export default abstract class Span {
  readonly context: Context;
  readonly type: SpanType;

  id = -1;
  parentId = -1;
  peer = '';
  operation: string;
  layer = SpanLayer.UNKNOWN;
  component = Component.UNKNOWN;

  readonly tags: Tag[] = [];
  readonly logs: Log[] = [];
  readonly refs: SegmentRef[] = [];

  startTime = 0;
  endTime = 0;
  errored = false;

  constructor(options: SpanCtorOptions & { type: SpanType; }) {
    this.context = options.context;
    this.operation = options.operation;
    this.type = options.type;

    if (options.id !== undefined) this.id = options.id;
    if (options.parentId !== undefined) this.parentId = options.parentId;
    if (options.peer) this.peer = options.peer;
    if (options.layer) this.layer = options.layer;
    if (options.component) this.component = options.component;
  }

  start(): this {
    this.startTime = new Date().getTime();
    this.context.start(this);
    return this;
  }

  stop(): this {
    this.context.stop(this);
    return this;
  }

  finish(segment: Segment): boolean {
    this.endTime = new Date().getTime();
    segment.archive(this);
    return true;
  }

  // noinspection JSUnusedLocalSymbols
  inject(carrier: ContextCarrier): this {
    throw new Error(`
      can only inject context carrier into ExitSpan, this may be a potential bug in the agent,
      please report this in https://github.com/apache/skywalking/issues if you encounter this.
    `);
  }

  extract(carrier: ContextCarrier): this {
    this.context.segment.relate(new ID(carrier.traceId));

    return this;
  }

  tag(tag: Tag): this {
    if (!tag.overridable) {
      this.tags.push(tag);
    }

    this.tags
      .filter(it => it.key === tag.key)
      .forEach(it => it.val = tag.val);

    return this;
  }
}
