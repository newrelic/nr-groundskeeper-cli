export const entitiesList = `
query EntitiesList($cursor: String) {
  actor {
    entitySearch(queryBuilder: {domain: APM, type: APPLICATION}) {
      results(cursor: $cursor) {
        entities {
          ... on ApmApplicationEntityOutline {
            guid
            name
            accountId
            language
            reporting
            runningAgentVersions {
              maxVersion
              minVersion
            }
          }
        }
        nextCursor
      }
      count
    }
  }
}
`;

export const agentUpdates = (accountId = "", guids = "") => `
{
  actor {
    nrql(
      accounts: [${accountId}]
      query: "FROM AgentUpdate SELECT latest(recommendedVersion) AS recommendedVersion SINCE 4 days ago WHERE entity.guid IN (${guids}) FACET entity.guid LIMIT MAX"
    ) {
      results
    }
  }
}
`;
