const express = require("express");
const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");
const { format, isValid } = require("date-fns");

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const app = express();
app.use(express.json());

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertTodoDbObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasCategoryAndPriorityProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const checkForQueryValues = (request, response, next) => {
  const { priority, status, category, date } = request.query;
  let isValidValue = true;
  if (hasPriorityProperty(request.query)) {
    if (priority !== "HIGH" || "LOW" || "MEDIUM") {
      isValidValue = false;
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  }
  if (hasStatusProperty(request.query)) {
    if (status !== "TO DO" || "IN PROGRESS" || "DONE") {
      isValidValue = false;
      response.status(400);
      response.send("Invalid Todo Status");
    }
  }
  if (hasCategoryProperty(request.query)) {
    if (category !== "WORK" || "HOME" || "LEARNING") {
      isValidValue = false;
      response.status(400);
      response.send("Invalid Todo Category");
    }
  }
  if (isValid(date) === false) {
    isValidValue = false;
    response.status(400);
    response.send("Invalid Due Date");
  }

  if (isValidValue) {
    next();
  }
};

//API 1
app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const {
    search_q = "",
    priority = "",
    status = "",
    category = "",
  } = request.query;

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodosQuery = `
        SELECT
            *
        FROM
            todo 
        WHERE
            todo LIKE '%${search_q}%'
            AND status = '${status}'
            AND priority = '${priority}';`;
      break;
    case hasPriorityProperty(request.query):
      getTodosQuery = `
            SELECT
                *
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND priority = '${priority}';`;
      break;
    case hasStatusProperty(request.query):
      getTodosQuery = `
            SELECT
                *
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND status = '${status}';`;
      break;
    case hasCategoryAndStatusProperty(request.query):
      getTodosQuery = `
        SELECT
            *
        FROM
            todo 
        WHERE
            todo LIKE '%${search_q}%'
            AND status = '${status}'
            AND category = '${category}';`;
      break;
    case hasCategoryProperty(request.query):
      getTodosQuery = `
            SELECT
                *
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND category = '${category}';`;
      break;
    case hasCategoryAndPriorityProperty(request.query):
      getTodosQuery = `
          SELECT
            *
          FROM
            todo 
          WHERE
            todo LIKE '%${search_q}%'
            AND priority = '${priority}'
            AND category = '${category}';`;
      break;
    default:
      getTodosQuery = `
        SELECT
            *
        FROM
            todo 
        WHERE
            todo LIKE '%${search_q}%';`;
      break;
  }
  data = await db.all(getTodosQuery);
  response.send(
    data.map((eachData) => convertTodoDbObjectToResponseObject(eachData))
  );
});

//API 2
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT * FROM todo
    WHERE id = ${todoId};`;
  const todoTask = await db.get(getTodoQuery);
  response.send(convertTodoDbObjectToResponseObject(todoTask));
});

//API 3
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const resultDate = date.split("-");
  const actualDate = format(
    new Date(
      parseInt(resultDate[0]),
      parseInt(resultDate[1] - 1),
      parseInt(resultDate[2])
    ),
    "yyyy-MM-dd"
  );
  const result = isValid(actualDate);
  console.log(result);
});

//API 4
app.post("/todos/", async (request, response) => {
  const todoTaskDetails = request.body;
  const { id, todo, priority, status, category, dueDate } = todoTaskDetails;
  const insertTodoQuery = `
    INSERT INTO 
    todo (id, todo, priority, status, category, due_date)
    VALUES 
    (
        ${id},
        '${todo}',
        '${priority}',
        '${status}',
        '${category}',
        '${dueDate}'
    );`;
  const dbResponse = await db.run(insertTodoQuery);
  const todoId = dbResponse.lastID;
  response.send("Todo Successfully Added");
});

//API 5
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const requestBodyDetails = request.body;
  const previousTodoQuery = `
    SELECT * FROM todo
    WHERE id = ${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);

  let updatedColumnResponse = "";
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodoQuery.due_date,
  } = requestBodyDetails;

  switch (true) {
    case todo !== previousTodo.todo:
      updatedColumnResponse = "Todo";
      break;
    case priority !== previousTodo.priority:
      updatedColumnResponse = "Priority";
      break;
    case status !== previousTodo.status:
      updatedColumnResponse = "Status";
      break;
    case category !== previousTodo.category:
      updatedColumnResponse = "Category";
      break;
    case dueDate !== previousTodo.due_date:
      updatedColumnResponse = "Due Date";
      break;
  }
  const updateTodoQuery = `
  UPDATE todo
  SET 
    todo = '${todo}',
    priority = '${priority}',
    status = '${status}'
  WHERE id = ${todoId};`;
  await db.run(updateTodoQuery);
  response.send(`${updatedColumnResponse} Updated`);
});

//API 6
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM todo
    WHERE id = ${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
