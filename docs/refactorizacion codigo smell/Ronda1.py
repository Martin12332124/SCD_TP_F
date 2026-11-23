Entrada_notas = [85, 90, 78, 92, 88]

def calculo_prom(notas):
    suma = 0
    for nota in notas:
        suma = suma + nota
    promedio = suma / len(notas)
    return promedio

resultado = calculo_prom(Entrada_notas)
print(resultado)