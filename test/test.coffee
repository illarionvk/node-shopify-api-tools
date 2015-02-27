'use strict'

chai = require('chai')
chaiAsPromised = require('chai-as-promised')
should = require('chai').should()
expect = require('chai').expect
nock = require('nock')
api = require('../index.js')

chai.use(chaiAsPromised)

describe('#fetchAll', ->

  it('should get two pages', ->
    scope = nock('https://myshop.myshopify.com')
      .defaultReplyHeaders({
        'X-shopify-shop-api-call-limit': '1/40'
        'Content-Type': 'application/json'
      })
      .get('/admin/products/count.json?limit=250')
      .reply(
        200
        {
          "count": 300
        }
      )
      .get('/admin/products.json?limit=250&page=1')
      .reply(
        200
        {
          "products": [
            {
              "id": 1
            }
            {
              "id": 2
            }
          ]
        }
      )
      .get('/admin/products.json?limit=250&page=2')
      .reply(
        200
        {
          "products": [
            {
              "id": 3
            }
          ]
        }
      )

    return api.fetchAll({
      apiConfig:
        shop: 'myshop.myshopify.com'
        apiKey: '1234'
        password: '5678'
      what: 'products'
    }).should.eventually.have.length(3)
  )
)

