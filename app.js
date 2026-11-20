"use strict";

// =====================================================================
// CONFIGURACIÓN
// =====================================================================
const CLAVE_STORAGE = "contactos_app";

const REGLAS = {
  nombreMinimo: 2,
  telefono: /^[0-9+\-\s()]{7,20}$/,
  correo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

const MENSAJES = {
  nombre: "El nombre debe tener al menos 2 caracteres.",
  telefono: "Ingresa un teléfono válido (7 a 20 dígitos).",
  correo: "Ingresa un correo válido.",
  duplicadoTelefono: (nombre) => `Ya existe un contacto con este teléfono: ${nombre}.`,
  duplicadoCorreo: (nombre) => `Ya existe un contacto con este correo: ${nombre}.`,
  errorGuardar: "No se pudieron guardar los datos en el navegador.",
  vacioSinContactos: "Aún no tienes contactos. ¡Agrega el primero!",
  vacioSinResultados: "Ningún contacto coincide con la búsqueda.",
};

// =====================================================================
// REFERENCIAS AL DOM
// =====================================================================
const dom = {
  form: document.getElementById("form-contacto"),
  id: document.getElementById("contacto-id"),
  nombre: document.getElementById("nombre"),
  telefono: document.getElementById("telefono"),
  correo: document.getElementById("correo"),
  notas: document.getElementById("notas"),
  tituloForm: document.getElementById("titulo-form"),
  btnGuardar: document.getElementById("btn-guardar"),
  btnCancelar: document.getElementById("btn-cancelar"),
  buscador: document.getElementById("buscador"),
  lista: document.getElementById("lista-contactos"),
  vacio: document.getElementById("vacio"),
  contador: document.getElementById("contador"),
};

const CAMPOS_VALIDABLES = ["nombre", "telefono", "correo"];

// =====================================================================
// ALMACENAMIENTO (localStorage)
// =====================================================================
const almacen = {
  cargar() {
    try {
      const datos = localStorage.getItem(CLAVE_STORAGE);
      return datos ? JSON.parse(datos) : [];
    } catch (error) {
      console.error("No se pudo leer localStorage:", error);
      return [];
    }
  },

  guardar(contactos) {
    try {
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(contactos));
    } catch (error) {
      console.error("No se pudo guardar en localStorage:", error);
      alert(MENSAJES.errorGuardar);
    }
  },
};

// =====================================================================
// ESTADO
// =====================================================================
let contactos = almacen.cargar();

// =====================================================================
// UTILIDADES
// =====================================================================
const generarId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Evita inyección de HTML al mostrar datos escritos por el usuario
function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

// Normalizadores para comparar contactos sin importar el formato escrito
const normalizarTelefono = (telefono) => telefono.replace(/\D/g, "");
const normalizarCorreo = (correo) => correo.trim().toLowerCase();

// =====================================================================
// VALIDACIÓN
// =====================================================================
function obtenerDatosFormulario() {
  return {
    nombre: dom.nombre.value.trim(),
    telefono: dom.telefono.value.trim(),
    correo: dom.correo.value.trim(),
    notas: dom.notas.value.trim(),
  };
}

/**
 * Busca un contacto ya existente con el mismo teléfono o el mismo correo.
 * Ignora al contacto que se está editando (idActual) para poder
 * guardar cambios sin que se detecte a sí mismo como duplicado.
 */
function buscarDuplicado(datos, idActual) {
  const telefono = normalizarTelefono(datos.telefono);
  const correo = normalizarCorreo(datos.correo);

  for (const contacto of contactos) {
    if (contacto.id === idActual) continue;

    if (telefono && normalizarTelefono(contacto.telefono) === telefono) {
      return { campo: "telefono", mensaje: MENSAJES.duplicadoTelefono(contacto.nombre) };
    }
    if (correo && normalizarCorreo(contacto.correo) === correo) {
      return { campo: "correo", mensaje: MENSAJES.duplicadoCorreo(contacto.nombre) };
    }
  }
  return null;
}

/** Devuelve un objeto { campo: mensaje } solo con los campos que tienen error. */
function validar(datos, idActual) {
  const errores = {};

  if (datos.nombre.length < REGLAS.nombreMinimo) {
    errores.nombre = MENSAJES.nombre;
  }
  if (!REGLAS.telefono.test(datos.telefono)) {
    errores.telefono = MENSAJES.telefono;
  }
  if (datos.correo && !REGLAS.correo.test(datos.correo)) {
    errores.correo = MENSAJES.correo;
  }

  // Solo se revisa si hay duplicado cuando el formato es correcto
  const duplicado = buscarDuplicado(
    {
      telefono: errores.telefono ? "" : datos.telefono,
      correo: errores.correo ? "" : datos.correo,
    },
    idActual
  );
  if (duplicado) {
    errores[duplicado.campo] = duplicado.mensaje;
  }

  return errores;
}

function mostrarError(campo, mensaje = "") {
  document.getElementById(`error-${campo}`).textContent = mensaje;
  dom[campo].classList.toggle("invalido", Boolean(mensaje));
}

function mostrarErrores(errores) {
  CAMPOS_VALIDABLES.forEach((campo) => mostrarError(campo, errores[campo]));
}

// =====================================================================
// CRUD
// =====================================================================
function crearContacto(datos) {
  contactos.push({ id: generarId(), ...datos });
}

function actualizarContacto(id, datos) {
  contactos = contactos.map((c) => (c.id === id ? { ...c, ...datos } : c));
}

function borrarContacto(id) {
  contactos = contactos.filter((c) => c.id !== id);
}

// =====================================================================
// FORMULARIO
// =====================================================================
function manejarEnvio(evento) {
  evento.preventDefault();

  const datos = obtenerDatosFormulario();
  const errores = validar(datos, dom.id.value);
  mostrarErrores(errores);
  if (Object.keys(errores).length > 0) return;

  if (dom.id.value) {
    actualizarContacto(dom.id.value, datos);
  } else {
    crearContacto(datos);
  }

  almacen.guardar(contactos);
  reiniciarFormulario();
  render();
}

function iniciarEdicion(id) {
  const contacto = contactos.find((c) => c.id === id);
  if (!contacto) return;

  dom.id.value = contacto.id;
  dom.nombre.value = contacto.nombre;
  dom.telefono.value = contacto.telefono;
  dom.correo.value = contacto.correo;
  dom.notas.value = contacto.notas;

  dom.tituloForm.textContent = "Editar contacto";
  dom.btnGuardar.textContent = "Actualizar contacto";
  dom.btnCancelar.hidden = false;
  mostrarErrores({});

  render();
  dom.form.scrollIntoView({ behavior: "smooth", block: "start" });
  dom.nombre.focus();
}

function reiniciarFormulario() {
  dom.form.reset();
  dom.id.value = "";
  dom.tituloForm.textContent = "Nuevo contacto";
  dom.btnGuardar.textContent = "Guardar contacto";
  dom.btnCancelar.hidden = true;
  mostrarErrores({});
}

function cancelarEdicion() {
  reiniciarFormulario();
  render();
}

function eliminarConConfirmacion(id) {
  const contacto = contactos.find((c) => c.id === id);
  if (!contacto) return;
  if (!confirm(`¿Eliminar a "${contacto.nombre}"?`)) return;

  borrarContacto(id);
  almacen.guardar(contactos);
  if (dom.id.value === id) reiniciarFormulario();
  render();
}

// =====================================================================
// RENDERIZADO
// =====================================================================
function filtrarContactos(texto) {
  const filtro = texto.trim().toLowerCase();
  return contactos
    .filter((c) =>
      [c.nombre, c.telefono, c.correo].some((campo) =>
        campo.toLowerCase().includes(filtro)
      )
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

function plantillaContacto(c) {
  const editando = c.id === dom.id.value ? "editando" : "";
  return `
    <li class="contacto ${editando}">
      <div class="avatar">${escapar(c.nombre.charAt(0).toUpperCase())}</div>
      <div class="info">
        <strong>${escapar(c.nombre)}</strong>
        <span>📞 ${escapar(c.telefono)}</span>
        ${c.correo ? `<span>✉️ ${escapar(c.correo)}</span>` : ""}
        ${c.notas ? `<em>${escapar(c.notas)}</em>` : ""}
      </div>
      <div class="botones">
        <button class="btn btn-chico btn-editar" data-accion="editar" data-id="${c.id}">Editar</button>
        <button class="btn btn-chico btn-peligro" data-accion="eliminar" data-id="${c.id}">Eliminar</button>
      </div>
    </li>`;
}

function render() {
  const visibles = filtrarContactos(dom.buscador.value);

  dom.contador.textContent = contactos.length;
  dom.vacio.hidden = visibles.length > 0;
  dom.vacio.textContent = contactos.length
    ? MENSAJES.vacioSinResultados
    : MENSAJES.vacioSinContactos;

  dom.lista.innerHTML = visibles.map(plantillaContacto).join("");
}

// =====================================================================
// EVENTOS E INICIO
// =====================================================================
function manejarClickLista(evento) {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;

  const { accion, id } = boton.dataset;
  if (accion === "editar") iniciarEdicion(id);
  if (accion === "eliminar") eliminarConConfirmacion(id);
}

function registrarEventos() {
  dom.form.addEventListener("submit", manejarEnvio);
  dom.btnCancelar.addEventListener("click", cancelarEdicion);
  dom.buscador.addEventListener("input", render);
  dom.lista.addEventListener("click", manejarClickLista);
}

function iniciar() {
  registrarEventos();
  render();
}

iniciar();
