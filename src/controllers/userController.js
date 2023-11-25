const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/dbConfig');
const nodemailer = require('nodemailer');

exports.register = async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // Verificar si el usuario ya existe
        const userExists = await checkUserExists(username, email);
        if (userExists) {
            // Aquí puedes renderizar una vista con un mensaje de error
            return res.render('register', { error: 'El usuario o el correo electrónico ya están registrados.' });
        }

        // Encriptar la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar el usuario en la base de datos
        const query = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
        db.query(query, [username, hashedPassword, email], (err, result) => {
            if (err) throw err;
            // Redirigir o renderizar una vista de éxito
            res.render('success', { message: 'Usuario registrado con éxito.' });
        });
    } catch (error) {
        res.status(500).render('register', { error: 'Error al registrar el usuario.' });
    }
};

const checkUserExists = (username, email) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM users WHERE username = ? OR email = ?';
        db.query(query, [username, email], (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result.length > 0);
            }
        });
    });
};


// La clave secreta debería estar en una variable de entorno para seguridad
const secretKey = process.env.JWT_SECRET || 'tu_clave_secreta_para_jwt';

// Función de ayuda para generar un código de verificación
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000); // Un código de 6 dígitos
}

// Configurar el transporte de correo electrónico
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

exports.login = async (req, res) => {
    try {
      const { username, password } = req.body;
  
      // Buscar al usuario por su nombre de usuario
      const query = 'SELECT * FROM users WHERE username = ?';
      db.query(query, [username], async (err, users) => {
        if (err) {
          return res.render('login', { error: 'Error al consultar la base de datos.' });
        }
  
        if (users.length === 0) {
          return res.render('login', { error: 'El nombre de usuario no existe.' });
        }
  
        const user = users[0];
  
        // Comparar la contraseña ingresada con la almacenada
        const match = await bcrypt.compare(password, user.password);
  
        if (!match) {
          return res.render('login', { error: 'Contraseña incorrecta.' });
        }
  
        // Generar un código de verificación
        const verificationCode = generateVerificationCode();
  
        // Aquí almacenarías el código en la base de datos junto con una marca de tiempo para expirar el código
        const updateQuery = 'UPDATE users SET verification_code = ?, verification_expiry = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?';
        db.query(updateQuery, [verificationCode, user.id], (updateErr, updateResult) => {
          if (updateErr) {
            return res.render('login', { error: 'Error al almacenar el código de verificación.' });
          }
  
          // Configurar las opciones de correo electrónico
          const mailOptions = {
            from: process.env.GMAIL_USER,
            to: user.email,
            subject: 'Tu Código de Verificación',
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; text-align: center; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9;">
                <h1 style="color: #333; text-align: center;">Código de Verificación</h1>
                <p style="color: #555; font-size: 16px; line-height: 1.5;">
                    Hola, <strong>${user.username}</strong>.<br>
                    Tu código de verificación es:
                </p>
                <div style="font-size: 24px; margin: 20px; padding: 10px; border-radius: 5px; background-color: #e9e9e9; color: #d6336c; font-weight: bold;">
                    ${verificationCode}
                </div>
                <p style="font-size: 14px; color: #777;">
                    Este código es válido por los próximos 10 minutos. Si no has solicitado este código, por favor ignora este mensaje.
                </p>
                <p style="font-size: 12px; color: #999;">
                    Gracias,<br>
                    El equipo de Soporte
                </p>
                </div>
                `
          };
  
          // Enviar el correo electrónico
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error(error);
              return res.render('enter-code', { error: 'Error al enviar el correo electrónico.', username:'username' });
            }
            // Si el correo se envía correctamente
            res.render('enter-code', { error: null, email: user.email, username: username });
          });          
        });
      });
    } catch (error) {
      res.render('login', { error: 'Hubo un problema al intentar iniciar sesión.' });
    }
  };

  exports.verifyCode = async (req, res) => {
    const { username, code1, code2, code3, code4, code5, code6 } = req.body;
    const code = `${code1}${code2}${code3}${code4}${code5}${code6}`;

    try {
        const query = 'SELECT * FROM users WHERE username = ?';
        db.query(query, [username], async (err, users) => {
            if (err) {
                console.error(err);
                return res.render('enter-code', {
                    error: 'Error al consultar la base de datos.',
                    username: username
                });
            }

            if (users.length === 0) {
                return res.render('enter-code', {
                    error: 'Usuario no encontrado.',
                    username: username 
                });
            }

            const user = users[0];
            const currentDateTime = new Date();
            const expiryDateTime = new Date(user.verification_expiry);

            // Verificar si el código coincide y si no ha expirado
            if (user.verification_code === code && currentDateTime < expiryDateTime) {
                // Si necesitas mantener al usuario logueado, aquí deberías configurar la sesión o la cookie con el JWT
                const token = jwt.sign({ id: user.id, username: user.username }, secretKey, { expiresIn: '1h' });

                // Aquí asumimos que tienes una vista 'dashboard.ejs' para renderizar
                return res.render('dashboard', { message: 'Verificación exitosa.', token });
            } else {
                // Si el código es incorrecto o ha expirado, renderiza nuevamente la vista con un mensaje de error
                return res.render('enter-code', {
                    error: 'Código incorrecto o expirado.',
                    username: username 
                });
            }
        });
    } catch (error) {
        console.error(error);
        return res.render('enter-code', {
            error: 'Hubo un problema al verificar el código.',
            username: username // Asegúrate de que esta variable está definida
        });
    }
};