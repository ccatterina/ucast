'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var core = require('@ucast/core');

const eq = (condition, query) => {
  return query.where(condition.field, '=', condition.value);
};
const ne = (condition, query) => {
  return query.where(condition.field, '<>', condition.value);
};
const lt = (condition, query) => {
  return query.where(condition.field, '<', condition.value);
};
const lte = (condition, query) => {
  return query.where(condition.field, '<=', condition.value);
};
const gt = (condition, query) => {
  return query.where(condition.field, '>', condition.value);
};
const gte = (condition, query) => {
  return query.where(condition.field, '>=', condition.value);
};
const exists = (condition, query) => {
  return query.whereRaw(`${query.field(condition.field)} is ${condition.value ? 'not ' : ''}null`);
};

function manyParamsOperator(name) {
  return (condition, query) => {
    return query.whereRaw(`${query.field(condition.field)} ${name}(${query.manyParams(condition.value).join(', ')})`);
  };
}

const within = manyParamsOperator('in');
const nin = manyParamsOperator('not in');
const mod = (condition, query) => {
  const params = query.manyParams(condition.value);
  return query.whereRaw(`mod(${query.field(condition.field)}, ${params[0]}) = ${params[1]}`);
};
const elemMatch = (condition, query, {
  interpret
}) => {
  return query.usingFieldPrefix(condition.field, () => interpret(condition.value, query));
};
const regex = (condition, query) => {
  const sql = query.options.regexp(query.field(condition.field), query.param(condition.value.source), condition.value.ignoreCase);
  return query.whereRaw(sql);
};

function compoundOperator(combinator, isInverted = false) {
  const childOptions = {
    linkParams: true
  };
  return (node, query, {
    interpret
  }) => {
    const childQuery = query.child(childOptions);
    node.value.forEach(condition => interpret(condition, childQuery));
    return query.merge(childQuery, combinator, isInverted);
  };
}

const not = compoundOperator('and', true);
const and = compoundOperator('and');
const or = compoundOperator('or');
const nor = compoundOperator('or', true);

var interpreters = /*#__PURE__*/Object.freeze({
  __proto__: null,
  eq: eq,
  ne: ne,
  lt: lt,
  lte: lte,
  gt: gt,
  gte: gte,
  exists: exists,
  within: within,
  nin: nin,
  mod: mod,
  elemMatch: elemMatch,
  regex: regex,
  not: not,
  and: and,
  or: or,
  nor: nor
});

function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

const _excluded = ["linkParams"];
class Query {
  constructor(options, fieldPrefix = '', relationContext) {
    this.options = void 0;
    this._fieldPrefix = void 0;
    this._params = [];
    this._sql = [];
    this._joins = new Set();
    this._lastPlaceholderIndex = 1;
    this._relationContext = void 0;
    this._rootAlias = void 0;
    this.options = options;
    this._fieldPrefix = fieldPrefix;
    this._relationContext = relationContext;
    this._rootAlias = options.rootAlias ? `${options.escapeField(options.rootAlias)}.` : '';

    if (this.options.foreignField) {
      this._foreignField = this.options.foreignField;
    }

    if (this.options.localField) {
      this._localField = this.options.localField;
    }
  }

  field(rawName) {
    const name = this._fieldPrefix + rawName;

    if (!this.options.joinRelation) {
      return this._rootAlias + this._localField(name);
    }

    const relationNameIndex = name.lastIndexOf('.');

    if (relationNameIndex === -1) {
      return this._rootAlias + this._localField(name);
    }

    const relationName = name.slice(0, relationNameIndex);
    const field = name.slice(relationNameIndex + 1);

    if (!this.options.joinRelation(relationName, this._relationContext)) {
      return this._rootAlias + this._localField(name);
    }

    relationName.split('.').forEach(r => this._joins.add(r));
    return this._foreignField(field, relationName);
  }

  _localField(field) {
    return this.options.escapeField(field);
  }

  _foreignField(field, relationName) {
    const relationLastAlias = relationName.split('.').slice(-1)[0];
    return `${this.options.escapeField(relationLastAlias)}.${this.options.escapeField(field)}`;
  }

  param(value) {
    const index = this._lastPlaceholderIndex + this._params.length;

    this._params.push(value);

    return this.options.paramPlaceholder(index);
  }

  manyParams(items) {
    return items.map(item => this.param(item));
  }

  child(options) {
    let queryOptions = this.options;
    let canLinkParams = false;

    if (options) {
      const {
        linkParams
      } = options,
            overrideOptions = _objectWithoutPropertiesLoose(options, _excluded);

      queryOptions = Object.assign({}, this.options, overrideOptions);
      canLinkParams = !!linkParams;
    }

    const query = new Query(queryOptions, this._fieldPrefix, this._relationContext);

    if (canLinkParams) {
      query._params = this._params;
      query._joins = this._joins; // TODO: investigate case of referencing relations of relations
    } else {
      query._lastPlaceholderIndex = this._lastPlaceholderIndex + this._params.length;
    }

    return query;
  }

  where(field, operator, value) {
    return this.whereRaw(`${this.field(field)} ${operator} ${this.param(value)}`);
  }

  whereRaw(sql) {
    this._sql.push(sql);

    return this;
  }

  merge(query, operator = 'and', isInverted = false) {
    const sql = query._sql.join(` ${operator} `);

    this._sql.push(`${isInverted ? 'not ' : ''}(${sql})`);

    if (this._params !== query._params) {
      this._params.push(...query._params);

      for (const relation of query._joins) {
        // eslint-disable-line
        this._joins.add(relation);
      }
    }

    return this;
  }

  usingFieldPrefix(prefix, callback) {
    const prevPrefix = this._fieldPrefix;

    try {
      this._fieldPrefix = `${prefix}.`;
      callback();
      return this;
    } finally {
      this._fieldPrefix = prevPrefix;
    }
  }

  toJSON() {
    return [this._sql.join(' and '), this._params, Array.from(this._joins)];
  }

}
function createSqlInterpreter(operators, options) {
  const interpret = core.createInterpreter(operators, options);
  return (condition, sqlOptions, relationContext) => {
    return interpret(condition, new Query(sqlOptions, '', relationContext)).toJSON();
  };
}

const allInterpreters = Object.assign({}, interpreters, {
  in: within
});

function posixRegex(field, placeholder, ignoreCase) {
  const operator = ignoreCase ? '~*' : '~';
  return `${field} ${operator} ${placeholder}`;
}

function regexp(field, placeholder) {
  return `${field} regexp ${placeholder} = 1`;
}

const questionPlaceholder = () => '?';

const $indexPlaceholder = index => `$${index}`;

const oracle = {
  regexp: posixRegex,
  paramPlaceholder: $indexPlaceholder,
  escapeField: field => `"${field}"`
};
const pg = oracle;
const mysql = {
  regexp,
  paramPlaceholder: questionPlaceholder,
  escapeField: field => `\`${field}\``
};
const sqlite = mysql;
const mssql = {
  regexp() {
    throw new Error('"regexp" operator is not supported in MSSQL');
  },

  paramPlaceholder: questionPlaceholder,
  escapeField: field => `[${field}]`
};
function createDialects(options) {
  const mssqlOptions = Object.assign({}, mssql, options);
  const pgOptions = Object.assign({}, pg, options);
  const oracleOptions = Object.assign({}, oracle, options);
  const mysqlOptions = Object.assign({}, mysql, options);
  const sqliteOptions = Object.assign({}, sqlite, options);
  return {
    mssql: mssqlOptions,
    oracle: oracleOptions,
    oracledb: oracleOptions,
    pg: pgOptions,
    postgres: pgOptions,
    mysql: mysqlOptions,
    mysql2: mysqlOptions,
    mariadb: mysqlOptions,
    sqlite: sqliteOptions,
    sqlite3: sqliteOptions
  };
}

exports.Query = Query;
exports.allInterpreters = allInterpreters;
exports.and = and;
exports.createDialects = createDialects;
exports.createSqlInterpreter = createSqlInterpreter;
exports.elemMatch = elemMatch;
exports.eq = eq;
exports.exists = exists;
exports.gt = gt;
exports.gte = gte;
exports.lt = lt;
exports.lte = lte;
exports.mod = mod;
exports.mssql = mssql;
exports.mysql = mysql;
exports.ne = ne;
exports.nin = nin;
exports.nor = nor;
exports.not = not;
exports.or = or;
exports.oracle = oracle;
exports.pg = pg;
exports.regex = regex;
exports.sqlite = sqlite;
exports.within = within;
//# sourceMappingURL=index.js.map
