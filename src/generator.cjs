const fs = require('node:fs');
const path = require('node:path');

// Configuration
const TOTAL_RECORDS = 10000000; // 2 Million
const OUTPUT_FILE = path.join(__dirname, '../data/employees.json');

// Helper arrays for random data generation
const firstNames = [
    'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth',
    'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
    'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
    'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
    'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa', 'Edward', 'Deborah',
    'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon', 'Jeffrey', 'Laura', 'Ryan', 'Cynthia',
    'Jacob', 'Kathleen', 'Gary', 'Amy', 'Nicholas', 'Shirley', 'Eric', 'Angela', 'Jonathan', 'Helen',
    'Stephen', 'Anna', 'Larry', 'Brenda', 'Justin', 'Pamela', 'Scott', 'Nicole', 'Brandon', 'Emma',
    'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Gregory', 'Christine', 'Frank', 'Debra', 'Alexander', 'Rachel',
    'Raymond', 'Catherine', 'Patrick', 'Carolyn', 'Jack', 'Janet', 'Dennis', 'Ruth', 'Jerry', 'Maria'
];

const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
    'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
    'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper',
    'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
    'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',
    'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez'
];

const departments = [
    'Engineering', 'Human Resources', 'Sales', 'Marketing', 'Finance', 
    'Legal', 'Operations', 'IT Support', 'Procurement', 'R&D', 
    'Customer Success', 'Product Management'
];
const designations = ['Intern', 'Junior', 'Senior', 'Lead', 'Manager', 'Director', 'VP'];

// Random Helper
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDate = () => new Date(Date.now() - Math.random() * 1000000000000).toISOString().split('T')[0];

console.log(`🚀 Generating ${TOTAL_RECORDS} records (NDJSON)...`);
console.time('Generation');

const stream = fs.createWriteStream(OUTPUT_FILE, { flags: 'w' });

let i = 0;
function write() {
    let ok = true;
    while (i < TOTAL_RECORDS && ok) {
        i++;
        const employee = {
            id: i,
            firstname: getRandom(firstNames),
            lastname: getRandom(lastNames),
            dob: getRandomDate(),
            hostel_room: `Room-${getRandomInt(100, 999)}`,
            ssn: `${getRandomInt(100, 999)}-${getRandomInt(10, 99)}-${getRandomInt(1000, 9999)}`,
            department: getRandom(departments),
            designation: getRandom(designations),
            salary: getRandomInt(40000, 150000),
            years_of_service: getRandomInt(0, 40)
        };

        // KEY CHANGE: No comma, no array brackets. Just Newline.
        ok = stream.write(JSON.stringify(employee) + '\n');
    }

    if (i < TOTAL_RECORDS) {
        stream.once('drain', write);
    } else {
        stream.end();
        console.timeEnd('Generation');
        console.log(`✅ Done! Saved to ${OUTPUT_FILE}`);
    }
}

write();