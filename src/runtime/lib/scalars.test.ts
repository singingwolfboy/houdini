import { test, expect, describe, afterEach, beforeEach } from 'vitest'

import { testConfigFile } from '../../common'
import { RequestContext } from './network'
import { marshalSelection, unmarshalSelection } from './scalars'
import { setMockConfig } from './test'
import { ArtifactKind, QueryArtifact } from './types'

beforeEach(() =>
	setMockConfig({
		client: '',
		scalars: {
			DateTime: {
				type: 'Date',
				unmarshal(val: number): Date {
					return new Date(val)
				},
				marshal(date: Date): number {
					return date.getTime()
				},
			},
		},
	})
)

// @ts-ignore
// a mock request context
const ctx = new RequestContext({
	fetch: (() => {}) as unknown as (input: RequestInfo, init?: RequestInit) => Promise<any>,
	params: {},
})

// the test artifact
const artifact: QueryArtifact = {
	name: 'AllItems',
	kind: ArtifactKind.Query,
	hash: 'hash',
	raw: 'does not matter',
	selection: {
		items: {
			type: 'TodoItem',
			keyRaw: 'allItems',

			fields: {
				createdAt: {
					type: 'DateTime',
					keyRaw: 'createdAt',
				},
				dates: {
					type: 'DateTime',
					keyRaw: 'dates',
				},
				creator: {
					type: 'User',
					keyRaw: 'creator',

					fields: {
						firstName: {
							type: 'String',
							keyRaw: 'firstName',
						},
					},

					list: {
						name: 'All_Items',
						type: 'User',
						connection: false,
					},
				},
			},

			list: {
				name: 'All_Items',
				type: 'User',
				connection: false,
			},
		},
	},
	rootType: 'Query',
	input: {
		fields: {
			date: 'NestedDate',
			booleanValue: 'Boolean',
			enumValue: 'EnumValue',
		},
		types: {
			NestedDate: {
				date: 'DateTime',
				dates: 'DateTime',
				nested: 'NestedDate',
				enumValue: 'EnumValue',
			},
		},
	},
}

describe('marshal inputs', function () {
	test('lists of objects', async function () {
		// some dates to check against
		const date1 = new Date(0)
		const date2 = new Date(1)
		const date3 = new Date(2)

		// compute the inputs
		const inputs = await ctx.computeInput({
			artifact,
			variableFunction() {
				return {
					date: [
						{
							date: date1,
							nested: {
								date: date2,
								nested: {
									date: date3,
									enumValue: 'asdf',
								},
							},
						},
					],
				}
			},
		})

		// make sure we got the expected value
		expect(inputs).toEqual({
			date: [
				{
					date: date1.getTime(),
					nested: {
						date: date2.getTime(),
						nested: {
							date: date3.getTime(),
							enumValue: 'asdf',
						},
					},
				},
			],
		})
	})

	test('list of scalars', async function () {
		// some dates to check against
		const date1 = new Date(0)
		const date2 = new Date(1)

		// compute the inputs
		const inputs = await ctx.computeInput({
			artifact,
			variableFunction() {
				return {
					date: [
						{
							dates: [date1, date2],
						},
					],
				}
			},
		})

		// make sure we got the expected value
		expect(inputs).toEqual({
			date: [
				{
					dates: [date1.getTime(), date2.getTime()],
				},
			],
		})
	})

	test('empty list of scalars', async function () {
		// compute the inputs
		const inputs = await ctx.computeInput({
			artifact,
			variableFunction() {
				return {
					date: [
						{
							dates: [],
						},
					],
				}
			},
		})

		// make sure we got the expected value
		expect(inputs).toEqual({
			date: [
				{
					dates: [],
				},
			],
		})
	})

	test('root fields', async function () {
		// compute the inputs
		const inputs = await ctx.computeInput({
			artifact,
			variableFunction() {
				return {
					booleanValue: true,
				}
			},
		})

		// make sure we got the expected value
		expect(inputs).toEqual({
			booleanValue: true,
		})
	})

	test('non-custom scalar fields of objects', async function () {
		// compute the inputs
		const inputs = await ctx.computeInput({
			artifact,
			variableFunction() {
				return {
					date: {
						name: 'hello',
					},
				}
			},
		})

		// make sure we got the expected value
		expect(inputs).toEqual({
			date: {
				name: 'hello',
			},
		})
	})

	test('non-custom scalar fields of lists', async function () {
		// compute the inputs
		const inputs = await ctx.computeInput({
			artifact,
			variableFunction() {
				return {
					date: [
						{
							name: 'hello',
						},
					],
				}
			},
		})

		// make sure we got the expected value
		expect(inputs).toEqual({
			date: [
				{
					name: 'hello',
				},
			],
		})
	})

	test('null', async function () {
		// compute the inputs
		const inputs = await ctx.computeInput({
			artifact,
			variableFunction() {
				return {
					date: null,
				}
			},
		})

		// make sure we got the expected value
		expect(inputs).toEqual({
			date: null,
		})
	})

	test('undefined', async function () {
		// compute the inputs
		const inputs = await ctx.computeInput({
			artifact,
			variableFunction() {
				return {
					date: undefined,
				}
			},
		})

		// make sure we got the expected value
		expect(inputs).toEqual({
			date: undefined,
		})
	})

	test('enums', async function () {
		// compute the inputs
		const inputs = await ctx.computeInput({
			artifact,
			variableFunction() {
				return {
					enumValue: 'ValueA',
				}
			},
		})

		// make sure we got the expected value
		expect(inputs).toEqual({
			enumValue: 'ValueA',
		})
	})

	test('list of enums', async function () {
		// compute the inputs
		const inputs = await ctx.computeInput({
			artifact,
			variableFunction() {
				return {
					enumValue: ['ValueA', 'ValueB'],
				}
			},
		})

		// make sure we got the expected value
		expect(inputs).toEqual({
			enumValue: ['ValueA', 'ValueB'],
		})
	})
})

describe('unmarshal selection', function () {
	test('list of objects', function () {
		// the date to compare against
		const date = new Date()

		const data = {
			items: [
				{
					createdAt: date.getTime(),
					creator: {
						firstName: 'John',
					},
				},
			],
		}

		expect(unmarshalSelection(testConfigFile(), artifact.selection, data)).toEqual({
			items: [
				{
					createdAt: date,
					creator: {
						firstName: 'John',
					},
				},
			],
		})
	})

	test('list of scalars', function () {
		// the date to compare against
		const date1 = new Date(1)
		const date2 = new Date(2)

		const data = {
			items: [
				{
					dates: [date1.getTime(), date2.getTime()],
				},
			],
		}

		expect(unmarshalSelection(testConfigFile(), artifact.selection, data)).toEqual({
			items: [
				{
					dates: [date1, date2],
				},
			],
		})
	})

	test('empty list of scalars', function () {
		const data = {
			items: [
				{
					dates: [],
				},
			],
		}

		expect(unmarshalSelection(testConfigFile(), artifact.selection, data)).toEqual({
			items: [
				{
					dates: [],
				},
			],
		})
	})

	test('missing unmarshal function', function () {
		const config = testConfigFile({
			scalars: {
				DateTime: {
					type: 'Date',
					marshal(date: Date): number {
						return date.getTime()
					},
				},
			},
		})

		const data = {
			items: [
				{
					dates: [new Date()],
				},
			],
		}

		// @ts-ignore
		expect(() => unmarshalSelection(config, artifact.selection, data)).toThrow(
			/scalar type DateTime is missing an `unmarshal` function/
		)
	})

	test('undefined', function () {
		const data = {
			item: undefined,
		}

		const selection = {
			item: {
				type: 'TodoItem',
				keyRaw: 'item',

				fields: {
					createdAt: {
						type: 'DateTime',
						keyRaw: 'createdAt',
					},
				},
			},
		}

		expect(unmarshalSelection(testConfigFile(), selection, data)).toEqual({
			item: undefined,
		})
	})

	test('null', function () {
		const data = {
			item: null,
		}

		const selection = {
			item: {
				type: 'TodoItem',
				keyRaw: 'item',

				fields: {
					createdAt: {
						type: 'DateTime',
						keyRaw: 'createdAt',
					},
				},
			},
		}

		expect(unmarshalSelection(testConfigFile(), selection, data)).toEqual({
			item: null,
		})
	})

	test('null inside', function () {
		const data = {
			item: {
				createdAt: null,
			},
		}

		const selection = {
			item: {
				type: 'TodoItem',
				keyRaw: 'item',

				fields: {
					createdAt: {
						type: 'DateTime',
						keyRaw: 'createdAt',
					},
				},
			},
		}

		expect(unmarshalSelection(testConfigFile(), selection, data)).toEqual({
			item: {
				createdAt: null,
			},
		})
	})

	test('nested objects', function () {
		// the date to compare against
		const date = new Date()

		const data = {
			item: {
				createdAt: date.getTime(),
				creator: {
					firstName: 'John',
				},
			},
		}

		const selection = {
			item: {
				type: 'TodoItem',
				keyRaw: 'item',

				fields: {
					createdAt: {
						type: 'DateTime',
						keyRaw: 'createdAt',
					},
					creator: {
						type: 'User',
						keyRaw: 'creator',

						fields: {
							firstName: {
								type: 'String',
								keyRaw: 'firstName',
							},
						},

						list: {
							name: 'All_Items',
							type: 'User',
							connection: false,
						},
					},
				},
			},
		}

		expect(unmarshalSelection(testConfigFile(), selection, data)).toEqual({
			item: {
				createdAt: date,
				creator: {
					firstName: 'John',
				},
			},
		})
	})

	test('fields on root', function () {
		const data = {
			rootBool: true,
		}

		const selection = {
			rootBool: {
				type: 'Boolean',
				keyRaw: 'rootBool',
			},
		}

		expect(unmarshalSelection(testConfigFile(), selection, data)).toEqual({
			rootBool: true,
		})
	})

	test('enums', function () {
		const data = {
			enumValue: 'Hello',
		}

		const selection = {
			enumValue: {
				type: 'EnumValue',
				keyRaw: 'enumValue',
			},
		}

		expect(unmarshalSelection(testConfigFile(), selection, data)).toEqual({
			enumValue: 'Hello',
		})
	})

	test('list of enums', function () {
		const data = {
			enumValue: ['Hello', 'World'],
		}

		const selection = {
			enumValue: {
				type: 'EnumValue',
				keyRaw: 'enumValue',
			},
		}

		expect(unmarshalSelection(testConfigFile(), selection, data)).toEqual({
			enumValue: ['Hello', 'World'],
		})
	})
})

describe('marshal selection', function () {
	test('list of objects', async function () {
		// the date to compare against
		const date = new Date()

		const data = {
			items: [
				{
					createdAt: date,
					creator: {
						firstName: 'John',
					},
				},
			],
		}

		await expect(
			marshalSelection({
				selection: artifact.selection,
				data,
			})
		).resolves.toEqual({
			items: [
				{
					createdAt: date.getTime(),
					creator: {
						firstName: 'John',
					},
				},
			],
		})
	})

	test('list of scalars', async function () {
		// the date to compare against
		const date1 = new Date(1)
		const date2 = new Date(2)

		const data = {
			items: [
				{
					dates: [date1, date2],
				},
			],
		}

		await expect(
			marshalSelection({
				selection: artifact.selection,
				data,
			})
		).resolves.toEqual({
			items: [
				{
					dates: [date1.getTime(), date2.getTime()],
				},
			],
		})
	})

	test('empty list of scalars', async function () {
		const data = {
			items: [
				{
					dates: [],
				},
			],
		}

		await expect(
			marshalSelection({
				selection: artifact.selection,
				data,
			})
		).resolves.toEqual({
			items: [
				{
					dates: [],
				},
			],
		})
	})

	test('missing marshal function', async function () {
		setMockConfig(
			testConfigFile({
				scalars: {
					DateTime: {
						type: 'Date',
					},
				},
			})
		)

		const data = {
			items: [
				{
					dates: [new Date()],
				},
			],
		}

		await expect(() =>
			marshalSelection({
				selection: artifact.selection,
				data,
			})
		).rejects.toThrow(/scalar type DateTime is missing a `marshal` function/)
	})

	test('undefined', async function () {
		const data = {
			item: undefined,
		}

		const selection = {
			item: {
				type: 'TodoItem',
				keyRaw: 'item',

				fields: {
					createdAt: {
						type: 'DateTime',
						keyRaw: 'createdAt',
					},
				},
			},
		}

		await expect(
			marshalSelection({
				selection,
				data,
			})
		).resolves.toEqual({
			item: undefined,
		})
	})

	test('null', async function () {
		const data = {
			item: null,
		}

		const selection = {
			item: {
				type: 'TodoItem',
				keyRaw: 'item',

				fields: {
					createdAt: {
						type: 'DateTime',
						keyRaw: 'createdAt',
					},
				},
			},
		}

		await expect(
			marshalSelection({
				selection,
				data,
			})
		).resolves.toEqual({
			item: null,
		})
	})

	test('nested objects', async function () {
		// the date to compare against
		const date = new Date()

		const data = {
			item: {
				createdAt: date,
				creator: {
					firstName: 'John',
				},
			},
		}

		const selection = {
			item: {
				type: 'TodoItem',
				keyRaw: 'item',

				fields: {
					createdAt: {
						type: 'DateTime',
						keyRaw: 'createdAt',
					},
					creator: {
						type: 'User',
						keyRaw: 'creator',

						fields: {
							firstName: {
								type: 'String',
								keyRaw: 'firstName',
							},
						},

						list: {
							name: 'All_Items',
							type: 'User',
							connection: false,
						},
					},
				},
			},
		}

		await expect(
			marshalSelection({
				selection,
				data,
			})
		).resolves.toEqual({
			item: {
				createdAt: date.getTime(),
				creator: {
					firstName: 'John',
				},
			},
		})
	})

	test('fields on root', async function () {
		const data = {
			rootBool: true,
		}

		const selection = {
			rootBool: {
				type: 'Boolean',
				keyRaw: 'rootBool',
			},
		}

		await expect(
			marshalSelection({
				selection,
				data,
			})
		).resolves.toEqual({
			rootBool: true,
		})
	})

	test('enums', async function () {
		const data = {
			enumValue: 'Hello',
		}

		const selection = {
			enumValue: {
				type: 'EnumValue',
				keyRaw: 'enumValue',
			},
		}

		await expect(
			marshalSelection({
				selection,
				data,
			})
		).resolves.toEqual({
			enumValue: 'Hello',
		})
	})

	test('list of enums', async function () {
		const data = {
			enumValue: ['Hello', 'World'],
		}

		const selection = {
			enumValue: {
				type: 'EnumValue',
				keyRaw: 'enumValue',
			},
		}

		await expect(
			marshalSelection({
				selection,
				data,
			})
		).resolves.toEqual({
			enumValue: ['Hello', 'World'],
		})
	})
})
