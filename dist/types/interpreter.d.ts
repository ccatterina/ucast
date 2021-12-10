import { Condition, InterpretationContext, InterpreterOptions } from '@ucast/core';
import { DialectOptions } from './dialects';
export interface SqlQueryOptions extends Required<DialectOptions> {
    rootAlias?: string;
    foreignField?(field: string, relationName: string): string;
    localField?(field: string): string;
    joinRelation?(relationName: string, context: unknown): boolean;
}
declare type ChildOptions = Partial<Pick<SqlQueryOptions, 'foreignField' | 'localField' | 'joinRelation'>> & {
    linkParams?: boolean;
};
export declare class Query {
    readonly options: SqlQueryOptions;
    private _fieldPrefix;
    private _params;
    private _sql;
    private _joins;
    private _lastPlaceholderIndex;
    private _relationContext;
    private _rootAlias;
    constructor(options: SqlQueryOptions, fieldPrefix?: string, relationContext?: unknown);
    field(rawName: string): string;
    private _localField;
    private _foreignField;
    param(value: unknown): string;
    manyParams(items: unknown[]): string[];
    child(options?: ChildOptions): Query;
    where(field: string, operator: string, value: unknown): this;
    whereRaw(sql: string): this;
    merge(query: Query, operator?: 'and' | 'or', isInverted?: boolean): this;
    usingFieldPrefix(prefix: string, callback: () => void): this;
    toJSON(): [string, unknown[], string[]];
}
export declare type SqlOperator<C extends Condition> = (condition: C, query: Query, context: InterpretationContext<SqlOperator<C>>) => Query;
interface SqlInterpreterOptions {
    getInterpreterName?: InterpreterOptions['getInterpreterName'];
}
export declare function createSqlInterpreter(operators: Record<string, SqlOperator<any>>, options?: SqlInterpreterOptions): (condition: Condition, sqlOptions: SqlQueryOptions, relationContext?: unknown) => [string, unknown[], string[]];
export {};
