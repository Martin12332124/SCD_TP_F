NOTA_MINIMA = 1
NOTA_MAXIMA = 7
NOTA_APROBACION = 4
ARCHIVO = "alumnos.txt"

def registrar_alumno(nombre, nota):
    # verifica si la nota es valida
    if nota < NOTA_MINIMA or nota > NOTA_MAXIMA:
        print("nota invalida")
        return
    # calcula si aprueba
    if nota >= NOTA_APROBACION:
        estado = "aprobado"
    else:
        estado = "reprobado"
    # guarda en archivo
    with open(ARCHIVO, "a") as archivo:
        archivo.write(f"{nombre},{nota},{estado}\n")
    # muestra mensaje
    print(f"{nombre}: {estado}")
    # calcula promedio del curso
    with open(ARCHIVO, "r") as archivo:
        lineas = archivo.readlines()
    notas = [float(linea.split(",")[1]) for linea in lineas]
    promedio = sum(notas) / len(notas)
    print(f"Promedio curso: {promedio:.1f}")
