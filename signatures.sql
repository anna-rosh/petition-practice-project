DROP TABLE IF EXISTS signatures;

CREATE TABLE signatures (
     id SERIAL PRIMARY KEY,
     sig TEXT NOT NULL CHECK (sig != ''),
     user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
);