import pg from 'pg';
import express from 'express';
import chalk from 'chalk';

const { Client } = pg;
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/2402_user_tasks';

const client = new Client(DATABASE_URL);

app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { rows: users } = await client.query(`
            SELECT * FROM users WHERE id = $1;
        `, [id]);

        const user = users[0];

        const { rows: tasks } = await client.query(`
            SELECT * FROM tasks WHERE tasks.owning_user_id = $1;
        `, [user.id]);

        user.tasks = tasks;

        res.send({
            user,
        });
    } catch (e) {
        console.log(chalk.red(`Failed to fetch user with ID ${id}!`));
        console.error(e);

        res.status(500).send({
            error: e.toString(),
        });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const { rows } = await client.query(`
            SELECT * FROM users;
        `);

        res.send({
            users: rows,
        });
    } catch (e) {
        console.log(chalk.red(`Failed to fetch users!`));
        console.error(e);

        res.status(500).send({
            error: e.toString(),
        });
    }
});

app.post('/api/users', async (req, res) => {
    const { user } = req.body;

    try {
        await client.query(`
            INSERT INTO users (email) VALUES ($1);
        `, [user.email]);

        res.status(201).send({
            message: `User with email ${user.email} created successfully!`,
        });
    } catch (e) {
        console.log(chalk.red(`Failed to create new user!`));
        console.error(e);

        res.status(500).send({
            error: e.toString(),
        });
    }
});

app.post('/api/tasks', async (req, res) => {
    const { user, task } = req.body;

    try {
        await client.query(
            `
                INSERT INTO tasks (title, description, complete, owning_user_id) VALUES ($1, $2, $3, $4);
            `,
            [
                task.title,
                task.description || '',
                task.complete || false,
                user.id,
            ],
        );

        res.status(201).send({
            message: `Task successfully created!`
        });
    } catch (e) {
        console.log(chalk.red(`Failed to create task!`));
        console.error(e);

        res.status(500).send({
            error: e.toString(),
        });
    }
});

const startApp = async () => {
    try {
        await client.connect();

        await client.query(`
            DROP TABLE IF EXISTS tasks;
            DROP TABLE IF EXISTS users;
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description VARCHAR(255),
                complete BOOLEAN DEFAULT false,
                owning_user_id INTEGER REFERENCES users(id) NOT NULL
            );
        `);

        app.listen(PORT, () => {
            console.log(chalk.green(`Server is now listening on PORT:${PORT}`));
        });
    } catch (e) {
        console.log(chalk.red(`Server failed to start.`));
        throw e;
    }
};

startApp();
