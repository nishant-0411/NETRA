import re
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))

from graph_retriever import GraphRetriever
from question_understanding import QuestionUnderstanding
from etl.pipelines.utils import get_langchain_llm


class GraphChatbot:

    def __init__(self):
        self.retriever = GraphRetriever()
        self.understanding = QuestionUnderstanding(self.retriever)
        self.llm = get_langchain_llm()

    def answer(self, question):
        parsed = self.understanding.understand(question)
        facts, required_values, missing_message = self._retrieve_facts(parsed)

        if missing_message:
            return missing_message

        if not facts:
            return (
                "No matching records were found in the knowledge graph "
                "for this question."
            )

        return self._explain_with_llm(question, facts, required_values)

    def _retrieve_facts(self, parsed):
        intent = parsed["intent"]
        persons = parsed["persons"]
        phones = parsed["phones"]
        vehicles = parsed["vehicles"]
        accounts = parsed["accounts"]
        licenses = parsed["licenses"]

        if intent == "UNKNOWN":
            return None, [], (
                "No known person, phone number, vehicle, account, or license "
                "from the knowledge graph was found in the question."
            )

        if intent == "PERSON_CONNECTION":
            return self._facts_person_connection(persons)

        if intent == "PERSON_PROFILE":
            return self._facts_person_profile(persons[0])

        if intent == "PERSON_PHONES":
            return self._facts_for_person(
                persons[0],
                self.retriever.get_person_phones,
                self.retriever.explain_person_phones
            )

        if intent == "PERSON_VEHICLES":
            return self._facts_for_person(
                persons[0],
                self.retriever.get_person_vehicles,
                self.retriever.explain_person_vehicles
            )

        if intent == "PERSON_ACCOUNTS":
            return self._facts_for_person(
                persons[0],
                self.retriever.get_person_accounts,
                self.retriever.explain_person_accounts
            )

        if intent == "PERSON_LICENSE":
            return self._facts_for_person(
                persons[0],
                self.retriever.get_person_licenses,
                self.retriever.explain_person_licenses
            )

        if intent == "PERSON_PEOPLE":
            return self._facts_for_person(
                persons[0],
                self.retriever.get_connected_people,
                self.retriever.explain_connected_people
            )

        if intent == "PERSON_CALLS":
            return self._facts_person_calls(persons[0])

        if intent == "PERSON_OUTGOING_CALLS":
            return self._facts_person_calls(persons[0], "outgoing")

        if intent == "PERSON_INCOMING_CALLS":
            return self._facts_person_calls(persons[0], "incoming")

        if intent == "PHONE_CALLS":
            return self._facts_phone_calls(phones[0])

        if intent == "PHONE_OUTGOING_CALLS":
            return self._facts_phone_calls(phones[0], "outgoing")

        if intent == "PHONE_INCOMING_CALLS":
            return self._facts_phone_calls(phones[0], "incoming")

        if intent == "PHONE_PROFILE":
            return self._facts_phone_profile(phones[0])

        if intent == "VEHICLE_LOOKUP":
            records = self.retriever.get_vehicle_owners(vehicles[0]["value"])
            facts = self.retriever.explain_vehicle_records(records)
            return facts, self._required_values_in_facts(
                facts,
                self._values_from_records(records)
            ), None

        if intent == "ACCOUNT_LOOKUP":
            records = self.retriever.get_account_owners(accounts[0]["value"])
            facts = self.retriever.explain_account_records(records)
            return facts, self._required_values_in_facts(
                facts,
                self._values_from_records(records)
            ), None

        if intent == "LICENSE_LOOKUP":
            records = self.retriever.get_license_holders(licenses[0]["value"])
            facts = self.retriever.explain_license_records(records)
            return facts, self._required_values_in_facts(
                facts,
                self._values_from_records(records)
            ), None

        return None, [], (
            "This type of investigation question is not yet supported."
        )

    def _facts_person_connection(self, persons):
        if len(persons) < 2:
            return None, [], (
                "The question does not name two people found "
                "in the knowledge graph."
            )

        person_a_name = persons[0]["name"]
        person_b_name = persons[1]["name"]

        person_a = self.retriever.find_person_by_name(person_a_name)
        person_b = self.retriever.find_person_by_name(person_b_name)

        if not person_a:
            return None, [], (
                f"Person '{person_a_name}' was not found "
                "in the knowledge graph."
            )

        if not person_b:
            return None, [], (
                f"Person '{person_b_name}' was not found "
                "in the knowledge graph."
            )

        paths = self.retriever.find_connection(
            person_a[0]["person_id"],
            person_b[0]["person_id"]
        )
        facts = self.retriever.explain_connection(paths)

        if not facts or facts.startswith("No connection"):
            return None, [], (
                f"No connection was found between "
                f"{person_a_name} and {person_b_name}."
            )

        required = [person_a_name, person_b_name]
        required.extend(re.findall(r"\b\d{10}\b", facts))

        return facts, required, None

    def _facts_person_profile(self, person):
        record = self._load_person(person)
        if not record:
            return None, [], (
                f"Person '{person.get('name')}' was not found "
                "in the knowledge graph."
            )

        person_id = record["person_id"]
        phones = self.retriever.get_person_phones(person_id)
        vehicles = self.retriever.get_person_vehicles(person_id)
        accounts = self.retriever.get_person_accounts(person_id)
        licenses = self.retriever.get_person_licenses(person_id)

        facts = self.retriever.explain_person_profile(
            record,
            phones,
            vehicles,
            accounts,
            licenses
        )

        required = self._required_values_in_facts(
            facts,
            [record.get("name"), record.get("person_id")]
            + self._values_from_records(phones + vehicles + accounts + licenses)
        )

        return facts, required, None

    def _facts_for_person(self, person, retrieve, explain):
        record = self._load_person(person)
        if not record:
            return None, [], (
                f"Person '{person.get('name')}' was not found "
                "in the knowledge graph."
            )

        rows = retrieve(record["person_id"])
        facts = explain(record["name"], rows)
        required = self._required_values_in_facts(
            facts,
            [record["name"]] + self._values_from_records(rows)
        )

        return facts, required, None

    def _facts_person_calls(self, person, direction=None):
        record = self._load_person(person)
        if not record:
            return None, [], (
                f"Person '{person.get('name')}' was not found "
                "in the knowledge graph."
            )

        phones = self.retriever.get_person_phones(record["person_id"])
        if not phones:
            return None, [], (
                f"No phone numbers associated with {record['name']} "
                "were found in the knowledge graph."
            )

        parts = [self.retriever.explain_person_phones(record["name"], phones)]
        required_source = [record["name"]]

        for phone in phones:
            number = phone.get("phone_number")
            if not number:
                continue

            required_source.append(number)
            calls = self.retriever.get_phone_calls(number, direction=direction)
            parts.append(self.retriever.explain_phone_calls(number, calls))
            required_source.extend(self._values_from_records(calls))

        facts = " ".join(parts)
        return facts, self._required_values_in_facts(facts, required_source), None

    def _facts_phone_calls(self, phone_number, direction=None):
        phone = self.retriever.find_phone_by_number(phone_number)
        if not phone:
            return None, [], (
                f"Phone number '{phone_number}' was not found "
                "in the knowledge graph."
            )

        calls = self.retriever.get_phone_calls(
            phone_number,
            direction=direction,
        )
        facts = self.retriever.explain_phone_calls(phone_number, calls)
        required = self._required_values_in_facts(
            facts,
            [phone_number] + self._values_from_records(calls)
        )

        return facts, required, None

    def _facts_phone_profile(self, phone_number):
        phone_rows = self.retriever.find_phone_by_number(phone_number)
        if not phone_rows:
            return None, [], (
                f"Phone number '{phone_number}' was not found "
                "in the knowledge graph."
            )

        users = self.retriever.get_phone_users(phone_number)
        calls = self.retriever.get_phone_calls(phone_number)
        facts = self.retriever.explain_phone_profile(
            phone_rows[0],
            users,
            calls
        )
        required = self._required_values_in_facts(
            facts,
            [phone_number] + self._values_from_records(users + calls)
        )

        return facts, required, None

    def _load_person(self, person):
        person_id = person.get("person_id")
        if person_id:
            rows = self.retriever.get_person(person_id)
            if rows:
                return rows[0]

        rows = self.retriever.find_person_by_name(person.get("name"))
        if rows:
            loaded = self.retriever.get_person(rows[0]["person_id"])
            return loaded[0] if loaded else rows[0]

        return None

    def _values_from_records(self, records):
        values = []
        identifier_keys = [
            "phone_number",
            "this_phone",
            "other_phone",
            "via_phone",
            "account_number",
            "ifsc_code",
            "license_number",
            "registration_number",
            "person_id",
            "name",
            "person_name",
        ]

        for record in records or []:
            for key in identifier_keys:
                value = record.get(key)
                if value:
                    values.append(str(value))

        return values

    def _required_values_in_facts(self, facts, values):
        required = []
        seen = set()

        for value in values:
            if not value:
                continue

            text = str(value)
            if text in seen:
                continue

            if text in facts:
                required.append(text)
                seen.add(text)

        return required

    def _explain_with_llm(self, question, facts, required_values):
        prompt = f"""
You are a criminal investigation assistant.

The following text contains VERIFIED FACTS extracted directly
from the investigation knowledge graph.

VERIFIED FACTS:
{facts}

INVESTIGATOR QUESTION:
{question}

Your task is to format the verified facts as a clear investigation
answer. You may add Markdown bullet markers, but every factual sentence
must otherwise remain verbatim.

STRICT RULES:
1. Use ONLY the verified facts provided above.
2. Do NOT add any new information.
3. Do NOT remove any factual relationship.
4. Do NOT change any identifier, phone number, account number,
   license number, registration number, date, or name.
5. Preserve every entity and relationship from the verified facts.
6. Do NOT say that a person directly called another person.
7. A CALLED relationship is strictly between two phone numbers.
8. You may say that two people are connected through a phone call
   only when the verified facts show that one person's associated
   phone called the other person's associated phone.
9. Do not infer motive, intention, identity, location, date,
   criminal activity, or any other fact that is not written above.
10. Do not add an introduction, conclusion, or any other text.
11. Preserve every factual sentence verbatim; only use bullet markers
    to improve readability.

VERIFIED FACTS ARE THE SOURCE OF TRUTH.

Answer:
"""

        generated_answer = self.llm.invoke(prompt)

        if self.validate_answer(generated_answer, facts, required_values):
            return generated_answer

        return facts

    def validate_answer(self, answer, facts, required_values):
        if not answer or not str(answer).strip():
            return False

        answer_text = str(answer)
        answer_lower = answer_text.lower()

        for value in required_values:
            if not value:
                continue

            value_text = str(value)
            if value_text.lower() not in answer_lower and value_text not in answer_text:
                return False

        for phone_number in re.findall(r"\b\d{10}\b", facts):
            if phone_number not in answer_text:
                return False

        # Identifiers alone are not sufficient.  For example, an answer
        # could retain two phone numbers while dropping the CALLED fact that
        # connects them.  Require every deterministic fact sentence to be
        # present, allowing only whitespace, case, and Markdown formatting
        # differences.  Anything else falls back to the graph explanation.
        normalized_answer = self._normalize_fact_text(answer_text)
        for sentence in self._fact_sentences(facts):
            if self._normalize_fact_text(sentence) not in normalized_answer:
                return False

        return True

    def _fact_sentences(self, facts):
        return [
            sentence.strip()
            for sentence in re.split(r"(?<=[.!?])\s+", facts or "")
            if sentence.strip()
        ]

    def _normalize_fact_text(self, text):
        text = re.sub(r"(?m)^\s*[-*+]\s+", "", str(text))
        return " ".join(text.lower().split())

    def close(self):
        self.retriever.close()


if __name__ == "__main__":
    chatbot = GraphChatbot()

    try:
        print("NETRA investigator chatbot. Type 'exit' to quit.")

        while True:
            question = input("\nInspector: ").strip()

            if not question:
                continue

            if question.lower() in {"exit", "quit"}:
                break

            print("\nNETRA:\n" + chatbot.answer(question))

    finally:
        chatbot.close()
