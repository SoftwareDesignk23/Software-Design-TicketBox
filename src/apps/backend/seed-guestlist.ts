import fs from 'fs'

const numRows = 1000
const filename = 'seed-guestlist.csv'

console.log(`Generating ${filename} with ${numRows} rows...`)

const stream = fs.createWriteStream(filename)

// Write header
stream.write('email,name,phone\n')

for (let i = 1; i <= numRows; i++) {
	const email = `guest${i}@example.com`
	const name = `Guest Number ${i}`
	const phone = `090${String(i).padStart(7, '0')}`

	// Create some duplicate emails to test idempotency
	if (i === 50) {
		stream.write(`guest10@example.com,Duplicate Guest,0901234567\n`)
	}

	// Create some missing emails to test error handling
	if (i === 100) {
		stream.write(`,Missing Email,0909999999\n`)
	}

	stream.write(`${email},${name},${phone}\n`)
}

stream.end()

console.log(`Successfully generated ${filename}!`)

