let experiencias = [];
let reservas = [];

let textoBusqueda = "";
let categoriaActual = "todas";
let precioMaximo = Infinity;
let ordenActual = "normal";

const catalogo = document.querySelector("#catalogo");
const buscador = document.querySelector("#buscador");
const filtroCategoria = document.querySelector("#filtroCategoria");
const filtroPrecioMax = document.querySelector("#filtroPrecioMax");
const ordenPrecio = document.querySelector("#ordenPrecio");
const listaReservas = document.querySelector("#listaReservas");
const total = document.querySelector("#total");
const totalPersonas = document.querySelector("#totalPersonas");
const estado = document.querySelector("#estado");
const mensajeNotificacion = document.querySelector("#mensajeNotificacion");
const btnVaciar = document.querySelector("#btnVaciar");

function mostrarMensaje(texto, tipo = "error") {
  mensajeNotificacion.textContent = texto;
  mensajeNotificacion.className = `notificacion ${tipo}`;
  setTimeout(() => {
    mensajeNotificacion.className = "notificacion oculto";
  }, 3500);
}

async function cargarExperiencias() {
  try {
    estado.textContent = "Cargando experiencias...";
    const respuesta = await fetch("data/experiencias.json");

    if (!respuesta.ok) {
      throw new Error("No fue posible cargar las experiencias");
    }

    experiencias = await respuesta.json();
    estado.textContent = `${experiencias.length} experiencias disponibles`;
    actualizarCatalogo();
  } catch (error) {
    estado.textContent = "Error al cargar la información";
    console.error(error);
  }
}

function obtenerResultados() {
  let resultados = [...experiencias];

  if (categoriaActual !== "todas") {
    resultados = resultados.filter(e => e.categoria.toLowerCase() === categoriaActual.toLowerCase());
  }

  if (textoBusqueda !== "") {
    resultados = resultados.filter(e =>
      e.nombre.toLowerCase().includes(textoBusqueda)
    );
  }

  if (!isNaN(precioMaximo)) {
    resultados = resultados.filter(e => e.precio <= precioMaximo);
  }

  if (ordenActual === "ascendente") {
    resultados.sort((a, b) => a.precio - b.precio);
  } else if (ordenActual === "descendente") {
    resultados.sort((a, b) => b.precio - a.precio);
  }

  return resultados;
}

function actualizarCatalogo() {
  const resultados = obtenerResultados();

  if (resultados.length === 0) {
    catalogo.innerHTML = '<p class="sin-resultados">No se encontraron experiencias</p>';
    estado.textContent = "0 resultados";
    return;
  }

  catalogo.innerHTML = resultados.map(e => `
    <article class="tarjeta">
      <div class="imagen">${e.icono}</div>
      <div class="informacion">
        <span class="categoria">${e.categoria}</span>
        <h3>${e.nombre}</h3>
        <p>Cupo disponible: ${e.cupo}</p>
        <p class="precio">$${e.precio} MXN</p>
        <label for="cantidad-${e.id}">Personas:</label>
        <input type="number" id="cantidad-${e.id}" min="1" max="${e.cupo}" value="1">
        <button class="btn-reservar" data-id="${e.id}">Agregar</button>
      </div>
    </article>
  `).join("");

  estado.textContent = `${resultados.length} resultados`;
  agregarEventosReservar();
}

function agregarEventosReservar() {
  document.querySelectorAll(".btn-reservar").forEach(boton => {
    boton.addEventListener("click", () => {
      agregarReserva(Number(boton.dataset.id));
    });
  });
}

function agregarReserva(id) {
  const experiencia = experiencias.find(e => e.id === id);
  const entrada = document.querySelector(`#cantidad-${id}`);
  const cantidad = Number(entrada.value);

  if (!experiencia || cantidad < 1 || cantidad > experiencia.cupo) {
    mostrarMensaje("Cantidad no válida o supera el cupo disponible.", "error");
    return;
  }

  const existente = reservas.find(r => r.experienciaId === id);

  if (existente) {
    const nuevaCantidad = existente.cantidad + cantidad;
    if (nuevaCantidad > experiencia.cupo) {
      mostrarMensaje("La cantidad acumulada supera el cupo disponible.", "error");
      return;
    }
    existente.cantidad = nuevaCantidad;
    existente.subtotal = nuevaCantidad * experiencia.precio;
  } else {
    reservas.push({
      experienciaId: experiencia.id,
      nombre: experiencia.nombre,
      precio: experiencia.precio,
      cantidad: cantidad,
      subtotal: experiencia.precio * cantidad
    });
  }

  mostrarMensaje("¡Experiencia agregada a tu reservación!", "exito");
  mostrarReservas();
}

function mostrarReservas() {
  if (reservas.length === 0) {
    listaReservas.innerHTML = "<p>No hay experiencias seleccionadas.</p>";
    total.textContent = "$0 MXN";
    totalPersonas.textContent = "0";
    btnVaciar.style.display = "none";
    return;
  }

  btnVaciar.style.display = "block";

  listaReservas.innerHTML = reservas.map(r => `
    <article class="item-reserva">
      <div>
        <strong>${r.nombre}</strong>
        <p>${r.cantidad} persona(s) × $${r.precio}</p>
        <div class="controles-cantidad">
          <button class="btn-modificar" data-id="${r.experienciaId}" data-accion="disminuir">-</button>
          <span>${r.cantidad}</span>
          <button class="btn-modificar" data-id="${r.experienciaId}" data-accion="aumentar">+</button>
        </div>
      </div>
      <div>
        <strong>$${r.subtotal} MXN</strong>
        <br>
        <button class="btn-eliminar" data-id="${r.experienciaId}">Eliminar</button>
      </div>
    </article>
  `).join("");

  const totalReserva = reservas.reduce((suma, r) => suma + r.subtotal, 0);
  const totalPersonasReserva = reservas.reduce((suma, r) => suma + r.cantidad, 0);

  total.textContent = `$${totalReserva} MXN`;
  totalPersonas.textContent = totalPersonasReserva;

  agregarEventosAccionesReserva();
}

function agregarEventosAccionesReserva() {
  document.querySelectorAll(".btn-eliminar").forEach(boton => {
    boton.addEventListener("click", () => {
      eliminarReserva(Number(boton.dataset.id));
    });
  });

  document.querySelectorAll(".btn-modificar").forEach(boton => {
    boton.addEventListener("click", () => {
      const id = Number(boton.dataset.id);
      const accion = boton.dataset.accion;
      modificarCantidadReserva(id, accion);
    });
  });
}

function modificarCantidadReserva(id, accion) {
  const reserva = reservas.find(r => r.experienciaId === id);
  const experiencia = experiencias.find(e => e.id === id);

  if (!reserva || !experiencia) return;

  if (accion === "aumentar") {
    if (reserva.cantidad + 1 > experiencia.cupo) {
      mostrarMensaje("No hay más cupo disponible para esta experiencia.", "error");
      return;
    }
    reserva.cantidad += 1;
  } else if (accion === "disminuir") {
    reserva.cantidad -= 1;
    if (reserva.cantidad <= 0) {
      eliminarReserva(id);
      return;
    }
  }

  reserva.subtotal = reserva.cantidad * reserva.precio;
  mostrarReservas();
}

function eliminarReserva(id) {
  reservas = reservas.filter(r => r.experienciaId !== id);
  mostrarMensaje("Experiencia eliminada del resumen.", "exito");
  mostrarReservas();
}

btnVaciar.addEventListener("click", () => {
  if (confirm("¿Estás seguro de que deseas vaciar toda tu reservación?")) {
    reservas = [];
    mostrarMensaje("Se ha vaciado la reservación.", "exito");
    mostrarReservas();
  }
});

buscador.addEventListener("input", () => {
  textoBusqueda = buscador.value.trim().toLowerCase();
  actualizarCatalogo();
});

filtroCategoria.addEventListener("change", () => {
  categoriaActual = filtroCategoria.value;
  actualizarCatalogo();
});

filtroPrecioMax.addEventListener("input", () => {
  const valor = Number(filtroPrecioMax.value);
  precioMaximo = valor === 0 || isNaN(valor) ? Infinity : valor;
  actualizarCatalogo();
});

ordenPrecio.addEventListener("change", () => {
  ordenActual = ordenPrecio.value;
  actualizarCatalogo();
});

cargarExperiencias();