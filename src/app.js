require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar el middleware de sesión
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));


// Middleware para analizar el cuerpo de las solicitudes POST
app.use(express.json()); // Para analizar solicitudes con contenido JSON
app.use(express.urlencoded({ extended: true })); // Para analizar solicitudes con datos de formulario

//las rutas de usuario
app.use('/users', userRoutes);

// Manejo de rutas no encontradas (404)
app.use((req, res, next) => {
    res.status(404).send("Lo sentimos, no pudimos encontrar eso!");
});

// Manejo de errores (middleware de error)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('¡Algo salió mal!');
});

//Configuración del puerto
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});