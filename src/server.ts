import { Hono } from 'hono/tiny'

const app = new Hono()

app.get('/', (c) => {
    return c.text('Hello Hono!')
})

export default {
    port: 8475,
    fetch: app.fetch.bind(app)
}
