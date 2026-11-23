UMBRAL_DESCUENTO = 50_000
FACTOR_DESCUENTO = 0.9
SEMANAS_PROMEDIO_MES = 4.33

def calcular_facturacion(items):
    resultado = []
    for item in items:
        if item["tipo"] == "cobro_unico":
            monto = item["precio"] * item["cantidad"]
            if monto > UMBRAL_DESCUENTO:
                monto = monto * FACTOR_DESCUENTO
            resultado.append((item["nombre"], monto))
        elif item["tipo"] == "suscripcion":
            monto = item["precio"] * item["horas"] * SEMANAS_PROMEDIO_MES
            if monto > UMBRAL_DESCUENTO:
                monto = monto * FACTOR_DESCUENTO
            resultado.append((item["nombre"], monto))
    return resultado
