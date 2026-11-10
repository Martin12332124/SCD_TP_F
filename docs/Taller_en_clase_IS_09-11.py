#Taller en clase IS 09-11
#Ronda 1 

def c(lst):
    t = 0
    for x in lst:
        t = t + x
    m = t / len(lst)
    return m

resultado = c([85, 90, 78, 92, 88])
print(resultado)

# Código refactorizado
def calcular_promedio(notas):
    suma_total = sum(notas)
    promedio = suma_total / len(notas)
    
    return promedio

notas_estudiantes = [85, 90, 78, 92, 88]
promedio_final = calcular_promedio(notas_estudiantes)
print(promedio_final)

#El smell dominante que encontramos con equipo, fue la presencia de "nombre críptico", y otro smell que afecta, pero en menor medida, sería numeros mágicos
# el cual está presente en todos los nombres de variables e incluso el nombre de la función
# esto debido a que los nombres del código no describen qué hacen exactamente
# en cuanto a numeros mágicos, está presente en la linea 2 y cuando se "prueba" la función en la variable resultado

#Ronda 2

def registrar_alumno(nombre, nota):
    # verifica si la nota es valida
    if nota < 1 or nota > 7:
        print("nota invalida")
        return
    # calcula si aprueba
    if nota >= 4:
        estado = "aprobado"
    else:
        estado = "reprobado"
    # guarda en archivo
    with open("alumnos.txt", "a") as f:
        f.write(f"{nombre},{nota},{estado}\n")
    # muestra mensaje
    print(f"{nombre}: {estado}")
    # calcula promedio del curso
    with open("alumnos.txt", "r") as f:
        lineas = f.readlines()
    notas = [float(l.split(",")[1]) for l in lineas]
    promedio = sum(notas) / len(notas)
    print(f"Promedio curso: {promedio:.1f}")

# Código refactorizado
NOTA_MINIMA = 1
NOTA_MAXIMA = 7
NOTA_APROBACION = 4
ARCHIVO_ALUMNOS = "alumnos.txt"

def calcular_promedio_curso():
    with open(ARCHIVO, "r") as f:
        notas = [float(linea.split(",")[1]) for linea in f.readlines()]
    return sum(notas) / len(notas)

def registrar_alumno(nombre, nota):
    if not (NOTA_MINIMA <= nota <= NOTA_MAXIMA):
        print("Nota inválida")
        return

    estado = "aprobado" if nota >= NOTA_APROBACION else "reprobado"
    
    with open(ARCHIVO, "a") as f:
        f.write(f"{nombre},{nota},{estado}\n")
        
    print(f"{nombre}: {estado}")
    print(f"Promedio curso: {calcular_promedio_curso():.1f}")



# Se detectaron 3 smell, que fueron los de numeros magicos, comentarios del "que" y, el más molesto, funcion que hace todo:
# Los numeros magicos se pueden encontrar en la linea 22 y 26, en los if, ya que podrían existir variables estáticas
# con sus respectivos nombres que contengan esos numeros.
# La funcion que hace todo se puede ver a la hora de la cantidad de cosass que pude hacer el programa, 
# como calcular notas validas, guardar achivo, calcular promedios, calcular si aprueba.
# Los comentarios repite lo que hace el codigo 

#Ronda 3

def proc(d):
res = []
for i in d:
    if i["t"] == "c":
        v = i["p"] * i["q"]
        if v > 50000:
            v = v * 0.9
        res.append((i["n"], v))
    elif i["t"] == "s":
        v = i["p"] * i["h"] * 4.33
        if v > 50000:
            v = v * 0.9
        res.append((i["n"], v))
return res

# Código refactorizado
UMBRAL_DESCUENTO = 50000
FACTOR_DESCUENTO = 0.9
SEMANAS_POR_MES = 4.33

def aplicar_descuento(monto):
    return monto * FACTOR_DESCUENTO if monto > UMBRAL_DESCUENTO else monto

def procesar_transacciones(transacciones):
    resultados = []
    
    for item in transacciones:
        if item["t"] == "c":
            subtotal = item["p"] * item["q"]
        elif item["t"] == "s":
            subtotal = item["p"] * item["h"] * SEMANAS_POR_MES
        else:
            continue
            
        total = aplicar_descuento(subtotal)
        resultados.append((item["n"], total))
        
    return resultados

# Se detectaron 4 smells, que fueron los de numeros magicos, nombre críptico, funcion que hace todo
# y el que creemos que es más relevante y grave es código duplicado:
# Los numeros mágicos se pueden encontrar en los if's y en sus cuerpos, ya que es imposible entender que
# representa cada numero del código
# nombre críptico los nombres de la funcion y de las variables no representan lo que son. 
# Hay código duplicado en el bloque del if anidado ya que se repite tanto en el if como en el elif
# Funcion que hace todo, se puede demostrar al ver que dentro de la función definida, existen subtareas que pueden 
# existir en funciones distintas separadas e independientes, como por ejemplo, "CalcularPrecio", separar funciones en;
# "CobroUnico" y "CobroSuscripcion"

# Propuesta de cambio
# Proc: podría llamarse "ProcesaFactura"
# el numero 50000, podría existir como una variable llamada ""
# los índices "p", "q", etc, deberían tener los nombres del contexto indicado