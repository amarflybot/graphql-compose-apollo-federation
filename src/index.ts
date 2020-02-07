import * as express from 'express';
import {default as expressPlayground} from "graphql-playground-middleware-express";
import {express as voyagerMiddleware} from "graphql-voyager/middleware";
import {altairExpress} from "altair-express-middleware";
import {graphql, ObjectTypeComposer, printSchema, printSchemaComposer, SchemaComposer} from "graphql-compose";
import {composeWithElastic} from "graphql-compose-elasticsearch";
import * as elasticsearch from "elasticsearch";
import {ApolloServer, gql} from "apollo-server-express";
import {buildFederatedSchema} from "./buildFederatedSchema";
import {collectFields} from "graphql/execution/execute";

const { GraphQLSchema, GraphQLObjectType } = graphql;

const expressPort = process.env.port || process.env.PORT || 9201;

const ecommerceMapping = {
  "properties" : {
    "category" : {
      "type" : "text",
      "fields" : {
        "keyword" : {
          "type" : "keyword"
        }
      }
    },
    "currency" : {
      "type" : "keyword"
    },
    "customer_birth_date" : {
      "type" : "date"
    },
    "customer_first_name" : {
      "type" : "text",
      "fields" : {
        "keyword" : {
          "type" : "keyword",
          "ignore_above" : 256
        }
      }
    },
    "customer_full_name" : {
      "type" : "text",
      "fields" : {
        "keyword" : {
          "type" : "keyword",
          "ignore_above" : 256
        }
      }
    },
    "customer_gender" : {
      "type" : "keyword"
    },
    "customer_id" : {
      "type" : "keyword"
    },
    "customer_last_name" : {
      "type" : "text",
      "fields" : {
        "keyword" : {
          "type" : "keyword",
          "ignore_above" : 256
        }
      }
    },
    "customer_phone" : {
      "type" : "keyword"
    },
    "day_of_week" : {
      "type" : "keyword"
    },
    "day_of_week_i" : {
      "type" : "integer"
    },
    "email" : {
      "type" : "keyword"
    },
    "geoip" : {
      "properties" : {
        "city_name" : {
          "type" : "keyword"
        },
        "continent_name" : {
          "type" : "keyword"
        },
        "country_iso_code" : {
          "type" : "keyword"
        },
        "location" : {
          "type" : "geo_point"
        },
        "region_name" : {
          "type" : "keyword"
        }
      }
    },
    "manufacturer" : {
      "type" : "text",
      "fields" : {
        "keyword" : {
          "type" : "keyword"
        }
      }
    },
    "order_date" : {
      "type" : "date"
    },
    "order_id" : {
      "type" : "keyword"
    },
    "products" : {
      "properties" : {
        "_id" : {
          "type" : "text",
          "fields" : {
            "keyword" : {
              "type" : "keyword",
              "ignore_above" : 256
            }
          }
        },
        "base_price" : {
          "type" : "half_float"
        },
        "base_unit_price" : {
          "type" : "half_float"
        },
        "category" : {
          "type" : "text",
          "fields" : {
            "keyword" : {
              "type" : "keyword"
            }
          }
        },
        "created_on" : {
          "type" : "date"
        },
        "discount_amount" : {
          "type" : "half_float"
        },
        "discount_percentage" : {
          "type" : "half_float"
        },
        "manufacturer" : {
          "type" : "text",
          "fields" : {
            "keyword" : {
              "type" : "keyword"
            }
          }
        },
        "min_price" : {
          "type" : "half_float"
        },
        "price" : {
          "type" : "half_float"
        },
        "product_id" : {
          "type" : "long"
        },
        "product_name" : {
          "type" : "text",
          "fields" : {
            "keyword" : {
              "type" : "keyword"
            }
          },
          "analyzer" : "english"
        },
        "quantity" : {
          "type" : "integer"
        },
        "sku" : {
          "type" : "keyword"
        },
        "tax_amount" : {
          "type" : "half_float"
        },
        "taxful_price" : {
          "type" : "half_float"
        },
        "taxless_price" : {
          "type" : "half_float"
        },
        "unit_discount_amount" : {
          "type" : "half_float"
        }
      }
    },
    "sku" : {
      "type" : "keyword"
    },
    "taxful_total_price" : {
      "type" : "half_float"
    },
    "taxless_total_price" : {
      "type" : "half_float"
    },
    "total_quantity" : {
      "type" : "integer"
    },
    "total_unique_products" : {
      "type" : "integer"
    },
    "type" : {
      "type" : "keyword"
    },
    "user" : {
      "type" : "keyword"
    }
  }
};

let elasticClient = new elasticsearch.Client({
  host: 'http://elastic:changeme@localhost:9200',
  apiVersion: '7.5',
  log: 'trace'
});

const EcommerceEsTC = composeWithElastic({
  graphqlTypeName: 'ecommerce',
  elasticIndex: 'kibana_sample_data_ecommerce',
  elasticType: '_doc',
  elasticMapping: ecommerceMapping,
  elasticClient: elasticClient
});

const ProxyTC = ObjectTypeComposer.createTemp(`type ProxyDebugType { source: JSON }`);

ProxyTC.addResolver({
  name: 'showArgs',
  kind: 'query',
  args: {
    source: 'JSON',
  },
  type: 'ProxyDebugType',
  resolve: ({ args }) => args,
});


EcommerceEsTC.addRelation('showRelationArguments', {
  resolver: () => ProxyTC.getResolver('showArgs'),
  prepareArgs: {
    source: source => source,
  }
});

const generatedSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      ecommerceSearch: EcommerceEsTC.getResolver('search').getFieldConfig(),
      ecommercePagination: EcommerceEsTC.getResolver('searchPagination').getFieldConfig(),
      ecommerceSearchConnection: EcommerceEsTC.getResolver('searchConnection').wrapResolve(next => async (rp) => {
        const { source, args, context, info } = rp;
        // check here args or contexts, or even you can change `rp.args` before passing it down to `search` resolver
        const result = await next(rp);
        // check and change result here before returning it to user
        console.log(result);
        return result;
      }).getFieldConfig()
    },
  }),
});

const schemaComposer = new SchemaComposer(generatedSchema);

schemaComposer.getOTC('ecommerceSearchHitItem')
    .removeField(['_index','_score','_shard','_node','_explanation','_version','_type'])
    .clearExtensions();

schemaComposer.addTypeDefs(` 
  extend type Content @key(fields: "id") {
    id: ID! @external
    ecommerces: [ecommerceecommerce]
  }
`);
const resolvers = {
  Content: {
    ecommerces(content) {
      return null;/*reviews.filter(review => review.product.upc === content.id);*/
    }
  }
};

schemaComposer.addResolveMethods(resolvers);

let composer = printSchemaComposer(schemaComposer, {include: ["Content",
    "ecommerceSearchOutput", "ecommerceSearchOutputPagination", "ecommerceSearchHitItem"],
  exclude: ['Boolean', 'String']});
const app = express();

console.log("template");
let resolveMethods = schemaComposer.getResolveMethods();
const server = new ApolloServer({
  schema: buildFederatedSchema([{typeDefs: gql(composer), resolvers: resolveMethods}])
});

server.applyMiddleware({ app });

app.use('/voyager', voyagerMiddleware({ endpointUrl: '/graphql' }));
app.use('/playground', expressPlayground({ endpoint: '/graphql' }));
app.use('/altair', altairExpress({endpointURL: '/graphql'}));


app.listen(expressPort, () => {
  console.log(`The server is running at http://localhost:${expressPort}/`);
});

const usernames = [
  { id: "1", username: "@ada" },
  { id: "2", username: "@complete" }
];
const reviews = [
  {
    id: "1",
    authorID: "1",
    product: { upc: "1" },
    body: "Love it!"
  },
  {
    id: "2",
    authorID: "1",
    product: { upc: "2" },
    body: "Too expensive."
  },
  {
    id: "3",
    authorID: "2",
    product: { upc: "3" },
    body: "Could be better."
  },
  {
    id: "4",
    authorID: "2",
    product: { upc: "1" },
    body: "Prefer something else."
  }
];
