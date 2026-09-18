import re


class QuestionUnderstanding:
    """
    Resolve question intent and entities against Neo4j only.

    The LLM is not used here and does not generate Cypher.
    """

    CONNECTION_KEYWORDS = [
        "connection",
        "connected",
        "connect",
        "link",
        "linked",
        "between",
        "related",
        "relation",
        "relationship",
        "beech",
        "sambandh",
        "how are",
        "how is",
    ]

    PHONE_KEYWORDS = [
        "phone",
        "mobile",
        "sim",
        "cellphone",
        "contact number",
        "phone number",
        "numbers",
    ]

    CALL_KEYWORDS = [
        "call",
        "called",
        "calling",
        "calls",
        "cdr",
        "dial",
        "incoming",
        "outgoing",
    ]

    OUTGOING_CALL_KEYWORDS = [
        "calls made",
        "call made",
        "outgoing",
        "outbound",
        "dialed",
        "dialled",
    ]

    INCOMING_CALL_KEYWORDS = [
        "calls received",
        "call received",
        "incoming",
        "inbound",
        "received calls",
    ]

    BOTH_CALL_DIRECTIONS_KEYWORDS = [
        "made or received",
        "received or made",
        "incoming or outgoing",
        "outgoing or incoming",
    ]

    VEHICLE_KEYWORDS = [
        "vehicle",
        "vehicles",
        "car",
        "bike",
        "registration",
        "rc number",
        "gaadi",
        "asset",
        "assets",
    ]

    ACCOUNT_KEYWORDS = [
        "account",
        "accounts",
        "bank",
        "ifsc",
        "khata",
    ]

    LICENSE_KEYWORDS = [
        "license",
        "licence",
        "dl",
        "driving",
    ]

    PEOPLE_KEYWORDS = [
        "connected people",
        "associates",
        "associate",
        "who is connected",
        "who are connected",
        "network",
        "linked to",
        "contacts",
    ]

    PROFILE_KEYWORDS = [
        "who is",
        "tell me about",
        "information",
        "details",
        "profile",
        "address",
        "about",
    ]

    def __init__(self, retriever):
        self.retriever = retriever

    def understand(self, question):
        persons = self.retriever.find_persons_mentioned_in_text(question)
        phones = self._resolve_phones(question)
        vehicles = self.retriever.find_nodes_mentioned_in_text(
            question,
            "Vehicle",
            "registration_number"
        )
        accounts = self.retriever.find_nodes_mentioned_in_text(
            question,
            "Account",
            "account_number"
        )
        licenses = self.retriever.find_nodes_mentioned_in_text(
            question,
            "License",
            "license_number"
        )

        intent = self.classify_intent(
            question,
            persons,
            phones,
            vehicles,
            accounts,
            licenses
        )

        return {
            "intent": intent,
            "persons": persons,
            "phones": phones,
            "vehicles": vehicles,
            "accounts": accounts,
            "licenses": licenses,
        }

    def classify_intent(
        self,
        question,
        persons,
        phones,
        vehicles,
        accounts,
        licenses
    ):
        question_lower = (question or "").lower()
        person_count = len(persons)

        if person_count >= 2 and self._contains_any(
            question_lower,
            self.CONNECTION_KEYWORDS
        ):
            return "PERSON_CONNECTION"

        if phones and self._contains_any(
            question_lower,
            self.BOTH_CALL_DIRECTIONS_KEYWORDS
        ):
            return "PHONE_CALLS"

        if phones and self._contains_any(
            question_lower,
            self.OUTGOING_CALL_KEYWORDS
        ):
            return "PHONE_OUTGOING_CALLS"

        if phones and self._contains_any(
            question_lower,
            self.INCOMING_CALL_KEYWORDS
        ):
            return "PHONE_INCOMING_CALLS"

        if phones and self._contains_any(question_lower, self.CALL_KEYWORDS):
            return "PHONE_CALLS"

        if person_count >= 1 and self._contains_any(
            question_lower,
            self.BOTH_CALL_DIRECTIONS_KEYWORDS
        ):
            return "PERSON_CALLS"

        if person_count >= 1 and self._contains_any(
            question_lower,
            self.OUTGOING_CALL_KEYWORDS
        ):
            return "PERSON_OUTGOING_CALLS"

        if person_count >= 1 and self._contains_any(
            question_lower,
            self.INCOMING_CALL_KEYWORDS
        ):
            return "PERSON_INCOMING_CALLS"

        if person_count >= 1 and self._contains_any(
            question_lower,
            self.CALL_KEYWORDS
        ):
            return "PERSON_CALLS"

        if person_count >= 1 and self._contains_any(
            question_lower,
            self.ACCOUNT_KEYWORDS
        ):
            return "PERSON_ACCOUNTS"

        if person_count >= 1 and self._contains_any(
            question_lower,
            self.LICENSE_KEYWORDS
        ):
            return "PERSON_LICENSE"

        if person_count >= 1 and self._contains_any(
            question_lower,
            self.VEHICLE_KEYWORDS
        ):
            return "PERSON_VEHICLES"

        if person_count >= 1 and self._contains_any(
            question_lower,
            self.PHONE_KEYWORDS
        ):
            return "PERSON_PHONES"

        if person_count >= 1 and self._contains_any(
            question_lower,
            self.PEOPLE_KEYWORDS
        ):
            return "PERSON_PEOPLE"

        if person_count >= 2:
            return "PERSON_CONNECTION"

        if person_count == 1:
            return "PERSON_PROFILE"

        if phones:
            return "PHONE_PROFILE"

        if vehicles:
            return "VEHICLE_LOOKUP"

        if accounts:
            return "ACCOUNT_LOOKUP"

        if licenses:
            return "LICENSE_LOOKUP"

        return "UNKNOWN"

    def _resolve_phones(self, question):
        mentioned = self.retriever.find_nodes_mentioned_in_text(
            question,
            "Phone",
            "phone_number"
        )

        phones = []
        seen = set()

        for record in mentioned:
            number = record.get("value")
            if number and number not in seen:
                phones.append(number)
                seen.add(number)

        for number in re.findall(r"\b\d{10}\b", question or ""):
            if number in seen:
                continue

            found = self.retriever.find_phone_by_number(number)
            if found:
                phones.append(number)
                seen.add(number)

        return phones

    def _contains_any(self, text, keywords):
        return any(keyword in text for keyword in keywords)
