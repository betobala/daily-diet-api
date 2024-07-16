import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import crypto from 'node:crypto'
import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  // Create Meal
  app.post(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const createMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        mealTime: z.string(),
        isDiet: z.boolean(),
      })

      const { name, description, mealTime, isDiet } =
        createMealBodySchema.parse(request.body)

      const sessionId = request.cookies.sessionId

      const user = await knex('users').where('session_id', sessionId).first()

      await knex('meals').insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        name,
        description,
        is_diet: isDiet,
        meal_time: mealTime,
      })

      return reply.status(201).send()
    },
  )
  // Edit Meal
  app.put(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const editMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = editMealParamsSchema.parse(request.params)

      const editMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        isDiet: z.boolean(),
        mealTime: z.string(),
      })

      const { name, description, isDiet, mealTime } = editMealBodySchema.parse(
        request.body,
      )

      const sessionId = request.cookies.sessionId

      const user = await knex('users').where('session_id', sessionId).first()

      const meal = await knex('meals')
        .where({
          id,
          user_id: user.id,
        })
        .update({
          name,
          description,
          is_diet: isDiet,
          meal_time: mealTime,
          updated_at: knex.fn.now(),
        })

      if (!meal) {
        return reply.status(400).send()
      }

      return reply.status(200).send()
    },
  )
  // Delete Meal
  app.delete(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const deleteMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = deleteMealParamsSchema.parse(request.params)

      const sessionId = request.cookies.sessionId

      const user = await knex('users').where('session_id', sessionId).first()

      const meal = await knex('meals')
        .where({
          id,
          user_id: user.id,
        })
        .delete()

      if (!meal) {
        return reply.status(400).send()
      }
      return reply.status(200).send()
    },
  )
  // List all Meals
  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const { sessionId } = request.cookies

      const user = await knex('users').where('session_id', sessionId).first()

      const meals = await knex('meals')
        .where('user_id', user.id)
        .orderBy('meal_time')
        .select()

      return { meals }
    },
  )
  // Get meal with ID
  app.get(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getMealParamsSchema.parse(request.params)

      const { sessionId } = request.cookies

      const user = await knex('users').where('session_id', sessionId).first()

      const meal = await knex('meals')
        .where({
          user_id: user.id,
          id,
        })
        .first()

      if (!meal) {
        return reply.status(404).send()
      }

      return { meal }
    },
  )
  // List summary
  app.get(
    '/summary',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const { sessionId } = request.cookies

      const user = await knex('users').where('session_id', sessionId).first()

      const meals = await knex('meals')
        .where('user_id', user.id)
        .orderBy('meal_time')
        .select()

      const mealsQuantity = meals.length

      const mealsOnDietQuantity = meals.filter(
        (meal) => meal.is_diet === 1,
      ).length

      const mealsOffDietQuantity = meals.filter(
        (meal) => meal.is_diet === 0,
      ).length

      interface MealsProps {
        id: string
        user_id: string
        name: string
        description: string
        is_diet: number
        meal_time: string
        created_at: string
        updated_at: string
      }

      function getBestOnDietSequence(meals: Array<MealsProps>) {
        const sequences: Array<number> = []
        let sequenceCounter = 0

        meals.forEach((meal) => {
          if (meal.is_diet === 1) {
            sequenceCounter = sequenceCounter + 1
          } else {
            sequences.push(sequenceCounter)
            sequenceCounter = 0
          }
        })

        return Math.max(...sequences)
      }

      const bestOnDietSequence = getBestOnDietSequence(meals).toString()

      return {
        mealsQuantity,
        mealsOnDietQuantity,
        mealsOffDietQuantity,
        bestOnDietSequence,
      }
    },
  )
}
