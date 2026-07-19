from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base de todos los schemas de entrada/salida de la API: el JSON usa
    camelCase (contrato con el dashboard y la app móvil), el código Python
    interno se queda en snake_case — mismo patrón que admin-panel-j2ec,
    "no negociable" según REQUERIMIENTOS_BACKEND_GYM.md §6.

    `populate_by_name=True` deja seguir instanciando estos modelos con
    kwargs en snake_case desde el propio código Python (p. ej.
    `MemberRead(first_name=...)` en un service) sin tener que escribir
    camelCase dentro del backend. `from_attributes=True` en la base evita
    repetirlo en cada schema `*Read` que se construye desde un objeto ORM.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
