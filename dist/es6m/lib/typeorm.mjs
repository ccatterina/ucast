import { createDialects, createSqlInterpreter, allInterpreters } from '../index';

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
    const alias = i > 0 ? relationParts[i - 1] : query.expressionMap.mainAlias?.name;

    if (!query.expressionMap.joinAttributes.some(j => j.alias.name === part)) {
      query.leftJoin(`${alias}.${part}`, part);
    }
  });
  return true;
}

const dialects = createDialects({
  joinRelation,
  paramPlaceholder: index => `:${index - 1}`,
  escapeField: field => field
}); // eslint-disable-next-line no-multi-assign

dialects.sqlite.escapeField = dialects.sqlite3.escapeField = dialects.pg.escapeField;
function createInterpreter(interpreters) {
  const interpretSQL = createSqlInterpreter(interpreters);
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
const interpret = createInterpreter(allInterpreters);

export { createInterpreter, interpret };
//# sourceMappingURL=typeorm.mjs.map
