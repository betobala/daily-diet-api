import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import crypto from 'node:crypto'
import { knex } from '../database'

export async function usersRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const createUserBodySchema = z.object({
      name: z.string(),
      email: z.string(),
      password: z.string(),
    })

    const { name, email, password } = createUserBodySchema.parse(request.body)

    await knex('users').insert({
      id: crypto.randomUUID(),
      name,
      email,
      password,
    })

    return reply.status(201).send()
  })

  app.patch('/', async (request, reply) => {
    const LoginBodySchema = z.object({
      email: z.string(),
      password: z.string(),
    })

    const { email, password } = LoginBodySchema.parse(request.body)

    const user = await knex('users').where('email', email).first()

    if (!user) {
      return reply.status(401).send('E-email não encontrado!')
    }

    if (user.password !== password) {
      return reply.status(401).send('Senha incorreta!')
    }

    const sessionId = crypto.randomUUID()

    reply.cookie('sessionId', sessionId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    await knex('users').where('email', user.email).update({
      session_id: sessionId,
    })

    return reply.status(201).send({ user, sessionId })
  })

  app.get('/', async () => {
    const users = await knex('users').select()

    return { users }
  })
}
