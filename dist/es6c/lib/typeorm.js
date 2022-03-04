'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var index = require('../index');

function joinRelation(relation, query) {
  const relationParts = relation.split('.');
  let meta = query.expressionMap.mainAlias?.metadata; // eslint-disable-next-line no-restricted-syntax

  for (const part of relationParts) {
    const relationData = meta?.findRelationWithPropertyPath(part);

    if (!relationData) {
      return false;
    }

    meta = relationData.inverseRelation?.entityMetadata;
  }

  relationParts.forEach((part, i) => {
    const alias = i > 0 ? relationParts.slice(0, i).join('_') : query.expressionMap.mainAlias?.name;
    const nextJoinAlias = relationParts.slice(0, i + 1).join('_');

    if (!query.expressionMap.joinAttributes.some(j => j.alias.name === nextJoinAlias)) {
      query.leftJoin(`${alias}.${part}`, nextJoinAlias);
    }
  });
  return true;
}

function foreignField(field, relationName) {
  return `${relationName.replace(/\./g, '_')}.${field}`;
}

const dialects = index.createDialects({
  joinRelation,
  paramPlaceholder: index => `:${index - 1}`,
  escapeField: field => field,
  foreignField
}); // eslint-disable-next-line no-multi-assign

dialects.sqlite.escapeField = dialects.sqlite3.escapeField = dialects.pg.escapeField;
function createInterpreter(interpreters) {
  const interpretSQL = index.createSqlInterpreter(interpreters);
  return (condition, query) => {
    const dialect = query.connection.options.type;

    if (!dialects[dialect]) {
      throw new Error(`Unsupported database dialect: ${dialect}`);
    }

    const options = Object.assign({
      rootAlias: query.alias
    }, dialects[dialect]);
    const [sql, params] = interpretSQL(condition, options, query);
    return query.where(sql, params);
  };
}
const interpret = createInterpreter(index.allInterpreters);

exports.createInterpreter = createInterpreter;
exports.interpret = interpret;
//# sourceMappingURL=typeorm.js.map
