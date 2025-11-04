o projeto tem a funcao de demonstrar a habilidade de um modelo de llm usar ferramentas. no caso
foram introduzidas 3 em especifico. uma ferramenta de conversao de moeda, uma de inforrmacao
sobre o clima e um leitor de pdf. o projeto so precisa de um comando para rodar. docker compose up
. apos esse comando 3 containers serao criados. o back, front e o container do ollama. no qual
sera baixado o modelo chines   qwen2.5:3b-instruct-q4_K_M  que pesa aproximadamente 5 gigas.
o usuario podera interagir normalmente. porem dada as informacoes que correspondam a uma das 
3 ferramentas. a ia podera decidir se faz a chamada da ferramenta ou nao. o projeto foi pensado 
para rodar o mais rapido perdendo o minimo de tempo possivel. (futuras possiveis melhorias,
adicionar rag, mais ferramentas. funcao de ativar as ferramenta disponiveis etc)
