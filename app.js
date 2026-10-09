// =====================================================
// ELEMENTOS DE LA INTERFAZ
// =====================================================

const form = document.getElementById("dispatchForm");
const btn = document.getElementById("submitBtn");
const msg = document.getElementById("formMessage");
const box = document.getElementById("resultBox");
const details = document.getElementById("resultDetails");
const body = document.getElementById("historyBody");
const hint = document.getElementById("productHint");


// =====================================================
// PESTAÑAS
// =====================================================

document.querySelectorAll(".tab").forEach(tab => {

    tab.addEventListener("click", () => {

        document.querySelectorAll(".tab").forEach(t => {
            t.classList.remove("active");
        });

        document.querySelectorAll(".view").forEach(view => {
            view.classList.remove("active");
        });

        tab.classList.add("active");

        const view = document.getElementById(tab.dataset.view);

        if (view) {
            view.classList.add("active");
        }

        if (tab.dataset.view === "historial") {
            loadHistory();
        }

    });

});


// =====================================================
// BOTÓN ACTUALIZAR HISTORIAL
// =====================================================

const refreshBtn = document.getElementById("refreshBtn");

if (refreshBtn) {
    refreshBtn.addEventListener("click", loadHistory);
}


// =====================================================
// CONSULTA DE PRODUCTO
// =====================================================

const codigoProducto = document.getElementById("codigoProducto");

if (codigoProducto) {

    codigoProducto.addEventListener("blur", () => {

        const codigo = codigoProducto.value.trim();

        if (!codigo) {

            hint.textContent =
                "Escribe un código para consultar el producto.";

            return;
        }

        hint.textContent =
            "El producto y sus existencias serán validados por Make.";

    });

}


// =====================================================
// ENVIAR SOLICITUD A MAKE
// =====================================================

if (form) {

    form.addEventListener("submit", async event => {

        event.preventDefault();

        const webhook = CONFIG.MAKE_WEBHOOK_URL;

        // Verificar configuración
        if (
            !webhook ||
            webhook.includes("AQUI_VA") ||
            webhook.includes("PEGAR_AQUI")
        ) {

            msg.textContent =
                "Falta configurar el webhook principal de Make.";

            return;
        }


        // Obtener datos del formulario
        const data = Object.fromEntries(
            new FormData(form).entries()
        );


        // Convertir cantidad a número
        data.cantidad = Number(data.cantidad);

        // Fecha de la solicitud
        data.fecha_solicitud = new Date().toISOString();

        // Acción que recibirá Make
        data.accion = "registrar_despacho";


        // Estado visual
        btn.disabled = true;
        btn.textContent = "Procesando...";

        msg.textContent =
            "Enviando solicitud a Make...";


        try {

            console.log("Datos enviados a Make:", data);


            // =================================================
            // CONSTRUIR FORM DATA PARA EVITAR HTTP 405
            // =================================================

            const requestBody = new URLSearchParams();

            Object.entries(data).forEach(([key, value]) => {

                requestBody.append(
                    key,
                    String(value ?? "")
                );

            });


            // =================================================
            // ENVIAR AL WEBHOOK
            // =================================================

            const response = await fetch(webhook, {

                method: "POST",

                body: requestBody

            });


            console.log(
                "HTTP status de Make:",
                response.status
            );


            const text = await response.text();

            console.log(
                "Respuesta completa de Make:",
                text
            );


            // =================================================
            // VALIDAR RESPUESTA
            // =================================================

            if (!response.ok) {

                throw new Error(
                    `Make respondió con HTTP ${response.status}: ${text}`
                );

            }


            // =================================================
            // INTENTAR LEER JSON
            // =================================================

            let result;

            try {

                result = text
                    ? JSON.parse(text)
                    : {
                        resultado: "RECIBIDO",
                        mensaje: "Make recibió la solicitud."
                    };

            } catch {

                result = {

                    resultado: text || "RECIBIDO",

                    mensaje:
                        "Make recibió correctamente la solicitud."

                };

            }


            // =================================================
            // MOSTRAR RESULTADO
            // =================================================

            showResult(result);

            msg.textContent =
                "Solicitud enviada correctamente.";

        }


        catch (error) {

            console.error(
                "Error completo al contactar Make:",
                error
            );


            box.className = "result rechazado";

            box.innerHTML = `
                <strong>No se pudo procesar la solicitud</strong>

                <span>
                    ${esc(error.message)}
                </span>
            `;


            msg.textContent =
                "No fue posible procesar la solicitud.";

        }


        finally {

            btn.disabled = false;

            btn.textContent =
                "Enviar solicitud";

        }

    });

}


// =====================================================
// MOSTRAR RESULTADO
// =====================================================

function showResult(result) {

    const resultado = String(
        result.resultado ||
        result.status ||
        "SIN RESULTADO"
    );


    const upper = resultado.toUpperCase();


    let clase = "neutral";


    // APROBADO CON ALERTA
    if (
        upper.includes("APROBADO") &&
        upper.includes("ALERTA")
    ) {

        clase = "alerta";

    }


    // APROBADO
    else if (upper.includes("APROBADO")) {

        clase = "aprobado";

    }


    // RECHAZADO
    else if (upper.includes("RECHAZADO")) {

        clase = "rechazado";

    }


    // FALLBACK / RESPALDO
    else if (
        upper.includes("RESPALDO") ||
        upper.includes("FALLBACK")
    ) {

        clase = "respaldo";

    }


    // =================================================
    // CAJA DE RESULTADO
    // =================================================

    box.className =
        `result ${clase}`;


    box.innerHTML = `

        <strong>
            ${esc(resultado)}
        </strong>

        <span>
            ${esc(result.mensaje || "")}
        </span>

    `;


    // =================================================
    // DETALLES
    // =================================================

    const campos = [

        ["Producto", result.codigo_producto],

        ["Cantidad", result.cantidad],

        ["Existencia anterior", result.existencia_antes],

        ["Saldo final", result.existencia_despues],

        ["Resultado", result.resultado]

    ];


    details.innerHTML = campos

        .filter(campo =>
            campo[1] !== undefined &&
            campo[1] !== null &&
            campo[1] !== ""
        )

        .map(campo => {

            return `

                <div>

                    <span>
                        ${esc(campo[0])}
                    </span>

                    <strong>
                        ${esc(String(campo[1]))}
                    </strong>

                </div>

            `;

        })

        .join("");

}


// =====================================================
// HISTORIAL
// =====================================================

async function loadHistory() {

    if (
        !CONFIG.HISTORY_WEBHOOK_URL ||
        CONFIG.HISTORY_WEBHOOK_URL.includes("AQUI_VA") ||
        CONFIG.HISTORY_WEBHOOK_URL.includes("PEGAR_AQUI")
    ) {

        body.innerHTML = `

            <tr>

                <td colspan="6">

                    Configura el webhook del historial.

                </td>

            </tr>

        `;

        return;
    }


    try {

        // =============================================
        // DATOS PARA EL WEBHOOK DEL HISTORIAL
        // =============================================

        const requestBody =
            new URLSearchParams();

        requestBody.append(
            "accion",
            "historial"
        );


        // =============================================
        // CONSULTAR MAKE
        // =============================================

        const response = await fetch(
            CONFIG.HISTORY_WEBHOOK_URL,
            {

                method: "POST",

                body: requestBody

            }
        );


        const text =
            await response.text();


        console.log(
            "Respuesta historial:",
            text
        );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        // =============================================
        // LEER RESPUESTA
        // =============================================

        let data;

        try {

            data = text
                ? JSON.parse(text)
                : [];

        } catch {

            data = [];

        }


        // =============================================
        // NORMALIZAR RESPUESTA
        // =============================================

        if (!Array.isArray(data)) {

            data =
                data.movimientos ||
                data.data ||
                [];

        }


        // =============================================
        // SIN MOVIMIENTOS
        // =============================================

        if (!data.length) {

            body.innerHTML = `

                <tr>

                    <td colspan="6">

                        Todavía no hay movimientos.

                    </td>

                </tr>

            `;

            return;

        }


        // =============================================
        // MOSTRAR MOVIMIENTOS
        // =============================================

        body.innerHTML = data.map(item => {

            return `

                <tr>

                    <td>

                        ${esc(
                            item.fecha_hora
                                ? new Date(
                                    item.fecha_hora
                                ).toLocaleString("es-CO")
                                : ""
                        )}

                    </td>


                    <td>

                        ${esc(
                            item.codigo_producto || ""
                        )}

                    </td>


                    <td>

                        ${esc(
                            item.cantidad ?? ""
                        )}

                    </td>


                    <td>

                        ${esc(
                            item.destino || ""
                        )}

                    </td>


                    <td>

                        ${esc(
                            item.resultado || ""
                        )}

                    </td>


                    <td>

                        ${esc(
                            item.saldo_resultante ?? ""
                        )}

                    </td>

                </tr>

            `;

        }).join("");

    }


    catch (error) {

        console.error(
            "Error cargando historial:",
            error
        );


        body.innerHTML = `

            <tr>

                <td colspan="6">

                    No fue posible cargar el historial.

                </td>

            </tr>

        `;

    }

}


// =====================================================
// ESCAPAR TEXTO
// =====================================================

function esc(value) {

    return String(value ?? "")

        .replace(
            /[&<>"']/g,
            character => {

                const entities = {

                    "&": "&amp;",

                    "<": "&lt;",

                    ">": "&gt;",

                    '"': "&quot;",

                    "'": "&#039;"

                };

                return entities[character];

            }
        );

}