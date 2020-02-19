import * as express from 'express';
import {express as voyagerMiddleware} from "graphql-voyager/middleware";
import {altairExpress} from "altair-express-middleware";
import {composeWithElastic} from "graphql-compose-elasticsearch";
import * as elasticsearch from "elasticsearch";
import {ApolloServer, gql, mergeSchemas} from "apollo-server-express";
import {buildFederatedSchema} from "./buildFederatedSchema";
import {GraphQLObjectType, GraphQLSchema} from "graphql";
import {schemaComposer} from "graphql-compose";
import {buildSchemaFromSDL, GraphQLSchemaModule, modulesFromSDL} from "apollo-graphql";

const expressPort = process.env.port || process.env.PORT || 9201;

const ecommerceMapping = {
    "properties" : {
        "labels" : {
            "properties" : {
                "priority" : {
                    "type" : "text",
                    "fields" : {
                        "keyword" : {
                            "type" : "keyword",
                            "ignore_above" : 256
                        }
                    }
                },
                "release" : {
                    "type" : "text",
                    "fields" : {
                        "keyword" : {
                            "type" : "keyword",
                            "ignore_above" : 256
                        }
                    }
                },
                "timestamp" : {
                    "properties" : {
                        "closed" : {
                            "type" : "long"
                        },
                        "created" : {
                            "type" : "long"
                        }
                    }
                }
            }
        },
        "title" : {
            "type" : "text",
            "fields" : {
                "keyword" : {
                    "type" : "keyword",
                    "ignore_above" : 256
                }
            }
        }
    }
};

let elasticClient = new elasticsearch.Client({
    host: 'http://elastic:changeme@localhost:9200',
    apiVersion: '7.5',
    log: 'trace'
});

//const schemaComposer = new SchemaComposer();

const EcommerceEsTC = composeWithElastic({
    graphqlTypeName: 'bugreport',
    elasticIndex: 'bug_reports',
    elasticType: '_doc',
    elasticMapping: ecommerceMapping,
    elasticClient: elasticClient,
    pluralFields: ['release'],
    schemaComposer: schemaComposer
});

/*const generatedSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      ecommerceSearch: EcommerceEsTC.getResolver('search').getFieldConfig(),
      ecommercePagination: EcommerceEsTC.getResolver('searchPagination').getFieldConfig(),
      ecommerceSearchConnection: EcommerceEsTC.getResolver('searchConnection').getFieldConfig()
    },
  }),
});*/

schemaComposer.Query.addFields({
    bgSearch: EcommerceEsTC.getResolver('search').getFieldConfig(),
    bgPagination: EcommerceEsTC.getResolver('searchPagination').getFieldConfig(),
    bgSearchConnection: EcommerceEsTC.getResolver('searchConnection').getFieldConfig(),
});

const extensionSdl = gql`
    extend type Content @key(fields: "id") {
        id: ID! @external
        ecommerces: [bugreportbugreport]
    }

    extend type Director @key(fields: "id") {
        id: ID! @external
        geoips: [bugreportbugreportLabels]
    }
`;

function findEcommerceByContentId(id: number) {

}

const app = express();

const resolvers = {
    Content: {
        ecommerces: async (content, args, context, info) => {
            console.log(content);
            return findEcommerceByContentId(content.id);/*find ecommerces by content id*/
        }
    },
    Director: {
        geoips: async (director, args, context, info) => {
            console.log(director);
            return findEcommerceByContentId(director.id);/*find ecommerces by content id*/
        }
    }
};
let composer = schemaComposer.toSDL({exclude: ['Boolean', 'String', 'ID']});
let resolveMethods = schemaComposer.getResolveMethods({exclude: ['Boolean', 'String', 'ID']});
const server = new ApolloServer({
  schema: buildFederatedSchema([
      {typeDefs: gql(composer), resolvers: resolveMethods},
      {typeDefs: extensionSdl, resolvers: resolvers}
      ]/*generatedSchema*/)
});

server.applyMiddleware({app});

app.use('/voyager', voyagerMiddleware({endpointUrl: '/graphql'}));

app.use('/altair', altairExpress({endpointURL: '/graphql'}));

app.listen(expressPort, () => {
    console.log(`The server is running at http://localhost:${expressPort}/`);
});
