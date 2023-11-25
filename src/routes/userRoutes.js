const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Ruta para mostrar el formulario de registro
router.get('/register', (req, res) => {
    res.render('register');
});

// Ruta para mostrar el formulario de login
router.get('/login',(req,res) =>{
    res.render('login', { error: null });
});

// Ruta para mostrar el formulario de verificar el código
router.get('/verify-code', (req, res) => {
    res.render('enter-code', { username: req.query.username, error: null });
});

// Ruta para manejar los datos del formulario de registro
router.post('/register', userController.register);

// Ruta de inicio de sesión
router.post('/login', userController.login);

// Ruta para verificar el código
router.post('/verify-code', userController.verifyCode);

// Ruta para manejar el cierre de sesión
router.post('/logout', (req, res) => {
    // Destruir la sesión del usuario
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            res.send("Hubo un error al cerrar la sesión.");
        } else {
            // Redirigir al usuario al login después de cerrar sesión
            res.redirect('/users/login');
        }
    });
});


module.exports = router;
