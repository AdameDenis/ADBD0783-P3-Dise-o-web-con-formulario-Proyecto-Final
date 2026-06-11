const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'static')));

// Cadena de conexión a MongoDB Atlas
const MONGO_URI = "mongodb://Adam_Denis:Denis1661@ac-hxriwj1-shard-00-00.twfeacr.mongodb.net:27017,ac-hxriwj1-shard-00-01.twfeacr.mongodb.net:27017,ac-hxriwj1-shard-00-02.twfeacr.mongodb.net:27017/Veterinaria_Pets_Inc?authSource=admin&retryWrites=true&w=majority&tls=true";
const client = new MongoClient(MONGO_URI);

let db, coleccion_vets, coleccion_prop, coleccion_masc, coleccion_hist, coleccion_estu;

// =====================
// CONEXIÓN E INICIO DE SERVIDOR
// =====================
async function iniciarServidor() {
    try {
        await client.connect();
        console.log("✅ Conectado con éxito a MongoDB Atlas");
        db = client.db('Veterinaria_Pets_Inc');
        
        // Definir colecciones
        coleccion_vets = db.collection('veterinarios');
        coleccion_prop = db.collection('propietarios');
        coleccion_masc = db.collection('mascotas');
        coleccion_hist = db.collection('historial_clinico');
        coleccion_estu = db.collection('estudios');
    } catch (error) {
        console.error("❌ Error al conectar a la base de datos (Revisa tu IP en Atlas):", error.message);
        
        // Crear colecciones 'stub' vacías para evitar que la página colapse
        const makeStubCollection = () => ({
            find: (q) => ({ toArray: async () => [] }),
            insertOne: async () => ({}),
            updateOne: async () => ({}),
            deleteOne: async () => ({})
        });
        coleccion_vets = makeStubCollection();
        coleccion_prop = makeStubCollection();
        coleccion_masc = makeStubCollection();
        coleccion_hist = makeStubCollection();
        coleccion_estu = makeStubCollection();
    }

    // CORRECCIÓN: Encendemos el servidor HASTA QUE la base de datos se resuelva
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo y listo en http://localhost:${PORT}`);
    });
}

// Arrancar todo
iniciarServidor();

// =====================
// FUNCIONES AUXILIARES
// =====================

function parseBusqueda(busqueda) {
    return /^\d+$/.test(busqueda) ? parseInt(busqueda) : busqueda;
}

function campoEsExacto(campo) {
    const camposExactos = new Set(["ID", "Mascota_ID", "Veterinario_ID", "Dueno_ID", "Medico_ID", "Clave_ID"]);
    return camposExactos.has(campo);
}

function queryPorCampo(campo, busqueda) {
    if (campoEsExacto(campo)) {
        return { [campo]: parseBusqueda(busqueda) };
    }
    const busquedaEscapada = busqueda.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    return { [campo]: { $regex: busquedaEscapada, $options: "i" } };
}

function queryPorCampos(campos, busqueda) {
    return { $or: campos.map(campo => queryPorCampo(campo, busqueda)) };
}

function verificarContrasenaAdmin(req) {
    console.log('verificarContrasenaAdmin called', !!req);
    try {
        if (!req || typeof req !== 'object') return false;
        let contrasena;
        if (req.body && typeof req.body === 'object' && Object.prototype.hasOwnProperty.call(req.body, 'admin_password')) {
            contrasena = req.body.admin_password;
        } else if (req.query && typeof req.query === 'object' && Object.prototype.hasOwnProperty.call(req.query, 'admin_password')) {
            contrasena = req.query.admin_password;
        } else if (req.headers && typeof req.headers === 'object') {
            contrasena = req.headers.admin_password || req.headers['x-admin-password'] || req.get && req.get('x-admin-password');
        }
        return contrasena === 'Denis1661';
    } catch (e) {
        console.error('Error verificando contraseña admin:', e);
        return false;
    }
}

// =====================
// RUTAS DE PÁGINAS HTML
// =====================

app.get(['/', '/index.html'], (req, res) => {
    res.render('index');
});

// Ver veterinarios
app.get('/fveterinarios.html', async (req, res) => {
    try {
        const busqueda = req.query.buscar || '';
        const campo = req.query.campo || 'todos';
        const campos = ["Nombre", "Cedula", "Especialidad", "Consultorio", "Disponibilidad", "Horario", "Telefono", "ID"];
        let query = {};

        if (busqueda) {
            query = (campo && campo !== 'todos') ? queryPorCampo(campo, busqueda) : queryPorCampos(campos, busqueda);
        }

        const lista_vets = await coleccion_vets.find(query).toArray();
        res.render('fveterinarios', { veterinarios: lista_vets, busqueda, campo });
    } catch (err) {
        res.status(500).send("Error en el servidor");
    }
});

// Ver propietarios
app.get('/fpropietarios.html', async (req, res) => {
    try {
        const busqueda = req.query.buscar || '';
        const campo = req.query.campo || 'todos';
        const campos = ["Nombre", "Mascota", "Direccion", "Telefono", "Tel_emergencia", "Correo", "ID"];
        let query = {};

        if (busqueda) {
            query = (campo && campo !== 'todos') ? queryPorCampo(campo, busqueda) : queryPorCampos(campos, busqueda);
        }

        const lista_prop = await coleccion_prop.find(query).toArray();
        res.render('fpropietarios', { propietarios: lista_prop, busqueda, campo });
    } catch (err) {
        res.status(500).send("Error en el servidor");
    }
});

// Ver mascotas
app.get('/fmascotas.html', async (req, res) => {
    try {
        const busqueda = req.query.buscar || '';
        const campo = req.query.campo || 'todos';
        const campos = ["Nombre", "Especie_Raza", "Edad", "Género", "Peso", "Dueno_ID", "Vacunas", "Caracteristicas", "ID"];
        let query = {};

        if (busqueda) {
            query = (campo && campo !== 'todos') ? queryPorCampo(campo, busqueda) : queryPorCampos(campos, busqueda);
        }

        const lista_masc = await coleccion_masc.find(query).toArray();
        res.render('fmascotas', { mascotas: lista_masc, busqueda, campo });
    } catch (err) {
        res.status(500).send("Error en el servidor");
    }
});

// Ver historial clínico
app.get('/fhistorial.html', async (req, res) => {
    try {
        const busqueda = req.query.buscar || '';
        const campo = req.query.campo || 'todos';
        const campos = ["Mascota_ID", "Veterinario_ID", "Estudio_Clave", "Fecha_Consulta"];
        let query = {};

        if (busqueda) {
            query = (campo && campo !== 'todos') ? queryPorCampo(campo, busqueda) : queryPorCampos(campos, busqueda);
        }

        const lista_hist = await coleccion_hist.find(query).toArray();
        res.render('fhistorial', { historial: lista_hist, busqueda, campo });
    } catch (err) {
        res.status(500).send("Error en el servidor");
    }
});

// Ver estudios
app.get('/festudios.html', async (req, res) => {
    try {
        const busqueda = req.query.buscar || '';
        const campo = req.query.campo || 'todos';
        const campos = ["Tipo_Servicio", "Costo", "Consultorio", "Medico_ID", "Clave_ID"];
        let query = {};

        if (busqueda) {
            query = (campo && campo !== 'todos') ? queryPorCampo(campo, busqueda) : queryPorCampos(campos, busqueda);
        }

        const lista_estu = await coleccion_estu.find(query).toArray();
        res.render('festudios', { estudios: lista_estu, busqueda, campo });
    } catch (err) {
        res.status(500).send("Error en el servidor");
    }
});

// ==========================================
// RUTAS PARA PROCESAR LOS FORMULARIOS (POST)
// ==========================================

app.post('/alta_veterinario', async (req, res) => {
    const id_val = req.body.id_veterinario;
    const datos_vet = {
        ID: parseBusqueda(id_val),
        Nombre: req.body.nombre,
        Cedula: req.body.cedula,
        Especialidad: req.body.especialidad,
        Consultorio: req.body.consultorio,
        Disponibilidad: req.body.disponibilidad,
        Horario: req.body.horario,
        Telefono: req.body.telefono
    };
    await coleccion_vets.insertOne(datos_vet);
    res.redirect('/fveterinarios.html');
});

app.post('/alta_propietario', async (req, res) => {
    const id_val = req.body.id_propietario;
    const datos_prop = {
        ID: parseBusqueda(id_val),
        Nombre: req.body.nombre,
        Mascota: req.body.mascota,
        Direccion: req.body.direccion,
        Telefono: req.body.telefono,
        Tel_emergencia: req.body.tel_emergencia,
        Correo: req.body.correo
    };
    await coleccion_prop.insertOne(datos_prop);
    res.redirect('/fpropietarios.html');
});

app.post('/alta_mascota', async (req, res) => {
    const id_val = req.body.id_mascota;
    const id_d = req.body.id_dueno;
    const datos_masc = {
        ID: parseBusqueda(id_val),
        Nombre: req.body.nombre,
        Especie_Raza: req.body.especie_raza,
        Edad: req.body.edad,
        Genero: req.body.genero,
        Peso: req.body.peso,
        Dueno_ID: parseBusqueda(id_d),
        Vacunas: req.body.vacunas,
        Caracteristicas: req.body.caracteristicas
    };
    await coleccion_masc.insertOne(datos_masc);
    res.redirect('/fmascotas.html');
});

app.post('/alta_historial', async (req, res) => {
    const id_m = req.body.id_mascota;
    const id_v = req.body.id_veterinario;
    const datos_hist = {
        Mascota_ID: parseBusqueda(id_m),
        Veterinario_ID: parseBusqueda(id_v),
        Estudio_Clave: req.body.estudio_clave,
        Fecha_Consulta: req.body.fecha_consulta
    };
    await coleccion_hist.insertOne(datos_hist);
    res.redirect('/fhistorial.html');
});

app.post('/alta_estudio', async (req, res) => {
    const id_c = req.body.id_clave;
    const id_m = req.body.medico_asignado;
    const datos_estu = {
        Clave_ID: parseBusqueda(id_c),
        Tipo_Servicio: req.body.tipo_servicio,
        Costo: req.body.costo,
        Medico_ID: parseBusqueda(id_m),
        Consultorio: req.body.consultorio
    };
    await coleccion_estu.insertOne(datos_estu);
    res.redirect('/festudios.html');
});

// ==========================================
// OPERACIONES DE ELIMINACIÓN
// ==========================================

app.get('/eliminar_veterinario/:id_vet', async (req, res) => {
    if (!verificarContrasenaAdmin(req)) return res.status(403).send("Contraseña de administrador incorrecta");
    await coleccion_vets.deleteOne({ ID: parseBusqueda(req.params.id_vet) });
    res.redirect('/fveterinarios.html');
});

app.get('/eliminar_propietario/:id_prop', async (req, res) => {
    if (!verificarContrasenaAdmin(req)) return res.status(403).send("Contraseña de administrador incorrecta");
    await coleccion_prop.deleteOne({ ID: parseBusqueda(req.params.id_prop) });
    res.redirect('/fpropietarios.html');
});

app.get('/eliminar_mascota/:id_masc', async (req, res) => {
    if (!verificarContrasenaAdmin(req)) return res.status(403).send("Contraseña de administrador incorrecta");
    await coleccion_masc.deleteOne({ ID: parseBusqueda(req.params.id_masc) });
    res.redirect('/fmascotas.html');
});

app.get('/eliminar_historial/:id_mascota', async (req, res) => {
    if (!verificarContrasenaAdmin(req)) return res.status(403).send("Contraseña de administrador incorrecta");
    await coleccion_hist.deleteOne({ Mascota_ID: parseBusqueda(req.params.id_mascota) });
    res.redirect('/fhistorial.html');
});

app.get('/eliminar_estudio/:clave_id', async (req, res) => {
    if (!verificarContrasenaAdmin(req)) return res.status(403).send("Contraseña de administrador incorrecta");
    await coleccion_estu.deleteOne({ Clave_ID: parseBusqueda(req.params.clave_id) });
    res.redirect('/festudios.html');
});

// ==========================================
// OPERACIONES DE ACTUALIZACIÓN
// ==========================================

app.post('/editar_veterinario/:id_vet', async (req, res) => {
    if (!verificarContrasenaAdmin(req)) return res.status(403).send("Contraseña de administrador incorrecta");
    const filtro = { ID: parseBusqueda(req.params.id_vet) };
    const nuevos_valores = { $set: {
        Nombre: req.body.nombre,
        Cedula: req.body.cedula,
        Especialidad: req.body.especialidad,
        Consultorio: req.body.consultorio,
        Disponibilidad: req.body.disponibilidad,
        Horario: req.body.horario,
        Telefono: req.body.telefono
    }};
    await coleccion_vets.updateOne(filtro, nuevos_valores);
    res.redirect('/fveterinarios.html');
});

app.post('/editar_propietario/:id_prop', async (req, res) => {
    if (!verificarContrasenaAdmin(req)) return res.status(403).send("Contraseña de administrador incorrecta");
    const filtro = { ID: parseBusqueda(req.params.id_prop) };
    const nuevos_valores = { $set: {
        Nombre: req.body.nombre,
        Mascota: req.body.mascota,
        Direccion: req.body.direccion,
        Telefono: req.body.telefono,
        Tel_emergencia: req.body.tel_emergencia,
        Correo: req.body.correo
    }};
    await coleccion_prop.updateOne(filtro, nuevos_valores);
    res.redirect('/fpropietarios.html');
});

app.post('/editar_mascota/:id_masc', async (req, res) => {
    if (!verificarContrasenaAdmin(req)) return res.status(403).send("Contraseña de administrador incorrecta");
    const filtro = { ID: parseBusqueda(req.params.id_masc) };
    const nuevos_valores = { $set: {
        Nombre: req.body.nombre,
        Especie_Raza: req.body.especie_raza,
        Edad: req.body.edad,
        Genero: req.body.genero,
        Peso: req.body.peso,
        Vacunas: req.body.vacunas,
        Caracteristicas: req.body.caracteristicas
    }};
    await coleccion_masc.updateOne(filtro, nuevos_valores);
    res.redirect('/fmascotas.html');
});

app.post('/editar_historial/:id_mascota', async (req, res) => {
    if (!verificarContrasenaAdmin(req)) return res.status(403).send("Contraseña de administrador incorrecta");
    const filtro = { Mascota_ID: parseBusqueda(req.params.id_mascota) };
    const nuevos_valores = { $set: {
        Veterinario_ID: parseBusqueda(req.body.id_veterinario),
        Estudio_Clave: req.body.estudio_clave,
        Fecha_Consulta: req.body.fecha_consulta
    }};
    await coleccion_hist.updateOne(filtro, nuevos_valores);
    res.redirect('/fhistorial.html');
});

app.post('/editar_estudio/:clave_id', async (req, res) => {
    if (!verificarContrasenaAdmin(req)) return res.status(403).send("Contraseña de administrador incorrecta");
    const filtro = { Clave_ID: parseBusqueda(req.params.clave_id) };
    const nuevos_valores = { $set: {
        Tipo_Servicio: req.body.tipo_servicio,
        Costo: req.body.costo,
        Medico_ID: parseBusqueda(req.body.medico_id),
        Consultorio: req.body.consultorio
    }};
    await coleccion_estu.updateOne(filtro, nuevos_valores);
    res.redirect('/festudios.html');
});
