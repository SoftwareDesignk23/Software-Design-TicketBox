export const reserveInventoryScript = `
local availableKey = KEYS[1]
local reservedKey = KEYS[2]
local pendingKey = KEYS[3]

local quantity = tonumber(ARGV[1])
local completed = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

local available = tonumber(redis.call('GET', availableKey) or '0')
if available < quantity then
	return {0, 'INSUFFICIENT', available}
end

local pending = tonumber(redis.call('GET', pendingKey) or '0')
if (pending + completed + quantity) > limit then
	return {0, 'LIMIT', pending}
end

redis.call('DECRBY', availableKey, quantity)
redis.call('INCRBY', reservedKey, quantity)
redis.call('INCRBY', pendingKey, quantity)

local remaining = available - quantity
return {1, remaining, pending + quantity}
`

export const releaseInventoryScript = `
local availableKey = KEYS[1]
local reservedKey = KEYS[2]
local pendingKey = KEYS[3]

local quantity = tonumber(ARGV[1])

local reserved = tonumber(redis.call('GET', reservedKey) or '0')
local pending = tonumber(redis.call('GET', pendingKey) or '0')

local releaseReserved = math.min(reserved, quantity)
local releasePending = math.min(pending, quantity)

redis.call('INCRBY', availableKey, releaseReserved)
redis.call('DECRBY', reservedKey, releaseReserved)
redis.call('DECRBY', pendingKey, releasePending)

return {1, releaseReserved}
`

export const completeInventoryScript = `
local reservedKey = KEYS[1]
local soldKey = KEYS[2]
local pendingKey = KEYS[3]

local quantity = tonumber(ARGV[1])

local reserved = tonumber(redis.call('GET', reservedKey) or '0')
local pending = tonumber(redis.call('GET', pendingKey) or '0')

local finalizeReserved = math.min(reserved, quantity)
local finalizePending = math.min(pending, quantity)

redis.call('DECRBY', reservedKey, finalizeReserved)
redis.call('INCRBY', soldKey, finalizeReserved)
redis.call('DECRBY', pendingKey, finalizePending)

return {1, finalizeReserved}
`

export const releaseLockScript = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
	return redis.call('DEL', KEYS[1])
end
return 0
`
