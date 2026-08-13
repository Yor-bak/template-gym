import calendar
from datetime import date, timedelta
from typing import Literal

DurationUnit = Literal["days", "weeks", "months", "years"]


def add_duration(base: date, amount: int, unit: DurationUnit) -> date:
    """Suma `amount` unidades de `unit` a `base`, con aritmética de
    calendario real para meses/años (no `amount * 30` días) — el día se
    recorta al último día del mes destino si se desborda (31 ene + 1 mes ->
    28/29 feb, nunca 3 de marzo)."""
    if unit == "days":
        return base + timedelta(days=amount)
    if unit == "weeks":
        return base + timedelta(weeks=amount)
    if unit == "months":
        return _add_months(base, amount)
    if unit == "years":
        return _add_months(base, amount * 12)
    raise ValueError(f"Unidad de duración desconocida: {unit}")


def _add_months(base: date, months: int) -> date:
    total_month_index = base.month - 1 + months
    year = base.year + total_month_index // 12
    month = total_month_index % 12 + 1
    day = min(base.day, calendar.monthrange(year, month)[1])
    return base.replace(year=year, month=month, day=day)
