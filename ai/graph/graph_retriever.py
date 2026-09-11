from ai.graph.neo4j_client import Neo4jClient


class GraphRetriever:
    def __init__(self):
        self.client = Neo4jClient()

    def get_graph_overview(self):
        query = """
        MATCH (n)
        RETURN labels(n) AS labels, count(n) AS count
        ORDER BY count DESC
        """

        return self.client.execute_query(query)

    def get_relationship_overview(self):
        query = """
        MATCH ()-[r]->()
        RETURN type(r) AS relationship, count(r) AS count
        ORDER BY count DESC
        """

        return self.client.execute_query(query)

    def get_person_network(self, person_id, max_hops=2):
        max_hops = max(1, min(int(max_hops), 10))
        query = f"""
        MATCH (p:Person {{person_id: $person_id}})
        MATCH path = (p)-[*1..{max_hops}]-(connected)

        RETURN
            [node IN nodes(path) | {
                labels: labels(node),
                properties: properties(node)
            }] AS nodes,
            [rel IN relationships(path) | type(rel)] AS relationships
        """

        return self.client.execute_query(
            query,
            {
                "person_id": person_id
            }
        )

    def find_connection(self, person_a, person_b, max_hops=4):
        max_hops = max(1, min(int(max_hops), 10))
        query = f"""
        MATCH (a:Person {{person_id: $person_a}})
        MATCH (b:Person {{person_id: $person_b}})

        MATCH path = shortestPath((a)-[*..{max_hops}]-(b))

        RETURN
            [node IN nodes(path) | {
                labels: labels(node),
                properties: properties(node)
            }] AS nodes,
            [rel IN relationships(path) | type(rel)] AS relationships
        """

        return self.client.execute_query(
            query,
            {
                "person_a": person_a,
                "person_b": person_b
            }
        )

    def node_display_name(self, node):
        properties = node.get("properties", {})
        labels = node.get("labels", [])

        if "Person" in labels:
            return properties.get(
                "name",
                properties.get("person_id", "Unknown Person")
            )

        if "Phone" in labels:
            return properties.get(
                "phone_number",
                properties.get("phone_id", "Unknown Phone")
            )

        if "Vehicle" in labels:
            return properties.get(
                "registration_number",
                properties.get("vehicle_id", "Unknown Vehicle")
            )

        if "Account" in labels:
            return properties.get(
                "account_number",
                properties.get("account_id", "Unknown Account")
            )

        if "License" in labels:
            return properties.get(
                "license_number",
                properties.get("license_id", "Unknown License")
            )

        if "Case" in labels:
            return properties.get("case_id", "Unknown Case")

        if "Document" in labels:
            return properties.get(
                "filename",
                properties.get("document_id", "Unknown Document")
            )

        return properties.get(
            "id",
            labels[0] if labels else "Unknown"
        )

    def format_paths(self, paths):
        formatted_paths = []

        for path in paths:
            nodes = path.get("nodes", [])
            relationships = path.get("relationships", [])

            if not nodes:
                continue

            parts = []

            for i, node in enumerate(nodes):
                parts.append(self.node_display_name(node))

                if i < len(relationships):
                    relationship = relationships[i]

                    if relationship == "USES":
                        parts.append("--USES-->")

                    elif relationship == "CALLED":
                        parts.append("--CALLED-->")

                    elif relationship == "OWNS":
                        parts.append("--OWNS-->")

                    elif relationship == "HAS_LICENSE":
                        parts.append("--HAS_LICENSE-->")

                    elif relationship == "HAS_DOCUMENT":
                        parts.append("--HAS_DOCUMENT-->")

                    else:
                        parts.append(f"--{relationship}-->")

            formatted_paths.append(" ".join(parts))

        return formatted_paths

    def explain_connection(self, paths):
        if not paths:
            return "No connection was found in the knowledge graph."

        explanations = []

        for path in paths:
            nodes = path.get("nodes", [])
            relationships = path.get("relationships", [])

            if len(nodes) != len(relationships) + 1:
                continue

            sentences = []

            for i, relationship in enumerate(relationships):
                current = nodes[i]
                next_node = nodes[i + 1]

                current_labels = current.get("labels", [])
                next_labels = next_node.get("labels", [])

                current_name = self.node_display_name(current)
                next_name = self.node_display_name(next_node)

                if relationship == "USES":
                    if "Person" in current_labels and "Phone" in next_labels:
                        sentences.append(
                            f"{current_name} is associated with phone number {next_name}."
                        )

                    elif "Phone" in current_labels and "Person" in next_labels:
                        sentences.append(
                            f"{next_name} is associated with phone number {current_name}."
                        )

                    else:
                        sentences.append(
                            f"{current_name} USES {next_name}."
                        )

                elif relationship == "CALLED":
                    if "Phone" in current_labels and "Phone" in next_labels:
                        sentences.append(
                            f"Phone number {current_name} called phone number {next_name}."
                        )

                    else:
                        sentences.append(
                            f"{current_name} CALLED {next_name}."
                        )

                elif relationship == "OWNS":
                    if "Vehicle" in next_labels:
                        sentences.append(
                            f"{current_name} owns vehicle {next_name}."
                        )

                    elif "Account" in next_labels:
                        sentences.append(
                            f"{current_name} owns bank account {next_name}."
                        )

                    elif "Vehicle" in current_labels:
                        sentences.append(
                            f"{next_name} owns vehicle {current_name}."
                        )

                    elif "Account" in current_labels:
                        sentences.append(
                            f"{next_name} owns bank account {current_name}."
                        )

                    else:
                        sentences.append(
                            f"{current_name} owns {next_name}."
                        )

                elif relationship == "HAS_LICENSE":
                    sentences.append(
                        f"{current_name} has license {next_name}."
                    )

                else:
                    sentences.append(
                        f"{current_name} {relationship} {next_name}."
                    )

            if sentences:
                explanations.append(" ".join(sentences))

        return "\n".join(explanations)

    def find_person_by_name(self, name):
        query = """
        MATCH (p:Person)
        WHERE toLower(p.name) = toLower($name)

        RETURN
            p.person_id AS person_id,
            p.name AS name
        LIMIT 1
        """

        return self.client.execute_query(
            query,
            {"name": name}
        )

    def find_persons_mentioned_in_text(self, text):
        """
        Find Person nodes whose names appear in the question text.
        Names come from Neo4j, so the chatbot does not guess identities.
        """
        if not text or not str(text).strip():
            return []

        query = """
        MATCH (p:Person)
        WHERE p.name IS NOT NULL
          AND size(trim(p.name)) > 0
          AND toLower($text) CONTAINS toLower(p.name)

        RETURN DISTINCT
            p.person_id AS person_id,
            p.name AS name
        """

        matches = self.client.execute_query(
            query,
            {"text": text}
        )

        return self._prefer_longest_distinct_names(text, matches)

    def _prefer_longest_distinct_names(self, text, matches):
        text_lower = text.lower()
        selected = []
        seen_ids = set()

        for match in sorted(
            matches,
            key=lambda item: len(item.get("name") or ""),
            reverse=True
        ):
            name = (match.get("name") or "").strip()
            person_id = match.get("person_id")

            if not name or person_id in seen_ids:
                continue

            name_lower = name.lower()
            already_selected_same_name = any(
                name_lower == kept["name"].lower()
                for kept in selected
            )

            if already_selected_same_name:
                continue

            covered_by_longer_name = any(
                name_lower != kept["name"].lower()
                and name_lower in kept["name"].lower()
                for kept in selected
            )

            if covered_by_longer_name:
                continue

            selected.append(match)
            seen_ids.add(person_id)

        selected.sort(
            key=lambda item: text_lower.find(item["name"].lower())
        )

        return selected

    def find_nodes_mentioned_in_text(self, text, label, match_property):
        if not text or not str(text).strip():
            return []

        query = f"""
        MATCH (n:{label})
        WHERE n.{match_property} IS NOT NULL
          AND size(trim(toString(n.{match_property}))) > 0
          AND toLower($text) CONTAINS toLower(toString(n.{match_property}))

        RETURN DISTINCT n.{match_property} AS value, properties(n) AS properties
        """

        return self.client.execute_query(
            query,
            {"text": text}
        )

    def find_phone_by_number(self, phone_number):
        query = """
        MATCH (ph:Phone {phone_number: $phone_number})
        RETURN
            ph.phone_id AS phone_id,
            ph.phone_number AS phone_number,
            ph.name AS name,
            ph.pan_number AS pan_number,
            ph.email AS email
        LIMIT 1
        """

        return self.client.execute_query(
            query,
            {"phone_number": phone_number}
        )

    def get_person(self, person_id):
        query = """
        MATCH (p:Person {person_id: $person_id})
        RETURN
            p.person_id AS person_id,
            p.name AS name,
            p.gender AS gender,
            p.dob AS dob,
            p.address AS address,
            p.social_handles AS social_handles
        LIMIT 1
        """

        return self.client.execute_query(
            query,
            {"person_id": person_id}
        )

    def get_person_phones(self, person_id):
        query = """
        MATCH (p:Person {person_id: $person_id})-[:USES]->(ph:Phone)
        RETURN
            ph.phone_id AS phone_id,
            ph.phone_number AS phone_number,
            ph.name AS registered_name,
            ph.pan_number AS pan_number,
            ph.email AS email
        """

        return self.client.execute_query(
            query,
            {"person_id": person_id}
        )

    def get_person_vehicles(self, person_id):
        query = """
        MATCH (p:Person {person_id: $person_id})-[:OWNS]->(v:Vehicle)
        RETURN
            v.vehicle_id AS vehicle_id,
            v.registration_number AS registration_number,
            v.maker AS maker,
            v.model AS model,
            v.color AS color,
            v.fuel_type AS fuel_type
        """

        return self.client.execute_query(
            query,
            {"person_id": person_id}
        )

    def get_person_accounts(self, person_id):
        query = """
        MATCH (p:Person {person_id: $person_id})-[:OWNS]->(a:Account)
        RETURN
            a.account_id AS account_id,
            a.account_number AS account_number,
            a.bank_name AS bank_name,
            a.branch_name AS branch_name,
            a.account_type AS account_type,
            a.ifsc_code AS ifsc_code
        """

        return self.client.execute_query(
            query,
            {"person_id": person_id}
        )

    def get_person_licenses(self, person_id):
        query = """
        MATCH (p:Person {person_id: $person_id})-[:HAS_LICENSE]->(l:License)
        RETURN
            l.license_id AS license_id,
            l.license_number AS license_number,
            l.state AS state,
            l.name AS name,
            l.dob AS dob,
            l.gender AS gender
        """

        return self.client.execute_query(
            query,
            {"person_id": person_id}
        )

    def get_connected_people(self, person_id):
        query = """
        MATCH (p:Person {person_id: $person_id})-[:USES]->(ph:Phone)
        MATCH (ph)-[:CALLED]-(other_phone:Phone)<-[:USES]-(other:Person)
        WHERE other.person_id <> $person_id

        RETURN DISTINCT
            other.person_id AS person_id,
            other.name AS name,
            ph.phone_number AS via_phone,
            other_phone.phone_number AS other_phone
        """

        return self.client.execute_query(
            query,
            {"person_id": person_id}
        )

    def get_phone_users(self, phone_number):
        query = """
        MATCH (p:Person)-[:USES]->(ph:Phone {phone_number: $phone_number})
        RETURN
            p.person_id AS person_id,
            p.name AS name,
            ph.phone_id AS phone_id,
            ph.phone_number AS phone_number
        """

        return self.client.execute_query(
            query,
            {"phone_number": phone_number}
        )

    def get_phone_calls(self, phone_number, direction=None, limit=25):
        if direction not in {None, "incoming", "outgoing"}:
            raise ValueError("direction must be incoming, outgoing, or None")

        query = """
        MATCH (ph:Phone {phone_number: $phone_number})
        MATCH (ph)-[c:CALLED]->(other:Phone)

        RETURN
            'outgoing' AS direction,
            ph.phone_number AS this_phone,
            other.phone_number AS other_phone,
            c.timestamp AS timestamp,
            c.duration_seconds AS duration_seconds,
            c.call_type AS call_type,
            c.cdr_id AS cdr_id

        UNION

        MATCH (ph:Phone {phone_number: $phone_number})
        MATCH (other:Phone)-[c:CALLED]->(ph)

        RETURN
            'incoming' AS direction,
            ph.phone_number AS this_phone,
            other.phone_number AS other_phone,
            c.timestamp AS timestamp,
            c.duration_seconds AS duration_seconds,
            c.call_type AS call_type,
            c.cdr_id AS cdr_id
        """

        records = self.client.execute_query(
            query,
            {"phone_number": phone_number}
        )

        if direction:
            records = [
                record for record in records
                if record.get("direction") == direction
            ]

        records.sort(
            key=lambda item: item.get("timestamp") or "",
            reverse=True
        )

        return records[:limit]

    def get_vehicle_owners(self, registration_number):
        query = """
        MATCH (v:Vehicle {registration_number: $registration_number})
        OPTIONAL MATCH (p:Person)-[:OWNS]->(v)
        RETURN
            v.vehicle_id AS vehicle_id,
            v.registration_number AS registration_number,
            v.maker AS maker,
            v.model AS model,
            v.color AS color,
            v.fuel_type AS fuel_type,
            p.person_id AS person_id,
            p.name AS person_name
        """

        return self.client.execute_query(
            query,
            {"registration_number": registration_number}
        )

    def get_account_owners(self, account_number):
        query = """
        MATCH (a:Account {account_number: $account_number})
        OPTIONAL MATCH (p:Person)-[:OWNS]->(a)
        RETURN
            a.account_id AS account_id,
            a.account_number AS account_number,
            a.bank_name AS bank_name,
            a.branch_name AS branch_name,
            a.account_type AS account_type,
            a.ifsc_code AS ifsc_code,
            p.person_id AS person_id,
            p.name AS person_name
        """

        return self.client.execute_query(
            query,
            {"account_number": account_number}
        )

    def get_license_holders(self, license_number):
        query = """
        MATCH (l:License {license_number: $license_number})
        OPTIONAL MATCH (p:Person)-[:HAS_LICENSE]->(l)
        RETURN
            l.license_id AS license_id,
            l.license_number AS license_number,
            l.state AS state,
            l.name AS license_name,
            p.person_id AS person_id,
            p.name AS person_name
        """

        return self.client.execute_query(
            query,
            {"license_number": license_number}
        )

    def explain_person_profile(self, person, phones, vehicles, accounts, licenses):
        if not person:
            return ""

        lines = [
            f"Person name: {person.get('name')}.",
            f"Person ID: {person.get('person_id')}."
        ]

        if person.get("gender"):
            lines.append(f"Gender: {person.get('gender')}.")

        if person.get("dob"):
            lines.append(f"Date of birth: {person.get('dob')}.")

        if person.get("address"):
            lines.append(f"Address: {person.get('address')}.")

        handles = person.get("social_handles") or []
        if handles:
            lines.append(
                "Social handles: " + ", ".join(str(item) for item in handles) + "."
            )

        lines.append(self.explain_person_phones(person.get("name"), phones))
        lines.append(self.explain_person_vehicles(person.get("name"), vehicles))
        lines.append(self.explain_person_accounts(person.get("name"), accounts))
        lines.append(self.explain_person_licenses(person.get("name"), licenses))

        return " ".join(line for line in lines if line)

    def explain_person_phones(self, person_name, phones):
        if not phones:
            return (
                f"No phone numbers associated with {person_name} "
                "were found in the knowledge graph."
            )

        numbers = [
            phone.get("phone_number")
            for phone in phones
            if phone.get("phone_number")
        ]

        return (
            f"{person_name} is associated with phone number(s): "
            + ", ".join(numbers) + "."
        )

    def explain_person_vehicles(self, person_name, vehicles):
        if not vehicles:
            return (
                f"No vehicles owned by {person_name} "
                "were found in the knowledge graph."
            )

        parts = []

        for vehicle in vehicles:
            registration = vehicle.get("registration_number") or vehicle.get("vehicle_id")
            details = [f"registration {registration}"]

            if vehicle.get("maker"):
                details.append(f"maker {vehicle.get('maker')}")

            if vehicle.get("model"):
                details.append(f"model {vehicle.get('model')}")

            if vehicle.get("color"):
                details.append(f"color {vehicle.get('color')}")

            parts.append(", ".join(details))

        return f"{person_name} owns vehicle(s): " + "; ".join(parts) + "."

    def explain_person_accounts(self, person_name, accounts):
        if not accounts:
            return (
                f"No bank accounts owned by {person_name} "
                "were found in the knowledge graph."
            )

        parts = []

        for account in accounts:
            account_number = account.get("account_number") or account.get("account_id")
            details = [f"account {account_number}"]

            if account.get("bank_name"):
                details.append(f"bank {account.get('bank_name')}")

            if account.get("ifsc_code"):
                details.append(f"IFSC {account.get('ifsc_code')}")

            if account.get("account_type"):
                details.append(f"type {account.get('account_type')}")

            parts.append(", ".join(details))

        return f"{person_name} owns bank account(s): " + "; ".join(parts) + "."

    def explain_person_licenses(self, person_name, licenses):
        if not licenses:
            return (
                f"No licenses for {person_name} "
                "were found in the knowledge graph."
            )

        parts = []

        for license_record in licenses:
            license_number = (
                license_record.get("license_number")
                or license_record.get("license_id")
            )
            details = [f"license {license_number}"]

            if license_record.get("state"):
                details.append(f"state {license_record.get('state')}")

            parts.append(", ".join(details))

        return f"{person_name} has license(s): " + "; ".join(parts) + "."

    def explain_connected_people(self, person_name, connections):
        if not connections:
            return (
                f"No people connected to {person_name} through phone calls "
                "were found in the knowledge graph."
            )

        sentences = []

        for connection in connections:
            other_name = connection.get("name") or connection.get("person_id")
            via_phone = connection.get("via_phone")
            other_phone = connection.get("other_phone")

            sentences.append(
                f"{person_name} is connected to {other_name} because "
                f"phone number {via_phone} is in a CALLED relationship with "
                f"phone number {other_phone}."
            )

        return " ".join(sentences)

    def explain_phone_calls(self, phone_number, calls):
        if not calls:
            return (
                f"No call records for phone number {phone_number} "
                "were found in the knowledge graph."
            )

        sentences = []

        for call in calls:
            direction = call.get("direction")
            other_phone = call.get("other_phone")
            timestamp = call.get("timestamp")
            duration = call.get("duration_seconds")
            call_type = call.get("call_type")

            if direction == "outgoing":
                sentence = (
                    f"Phone number {phone_number} called phone number {other_phone}."
                )
            else:
                sentence = (
                    f"Phone number {other_phone} called phone number {phone_number}."
                )

            extras = []

            if timestamp:
                extras.append(f"timestamp {timestamp}")

            if duration is not None:
                extras.append(f"duration_seconds {duration}")

            if call_type:
                extras.append(f"call_type {call_type}")

            if extras:
                sentence = sentence[:-1] + " (" + ", ".join(str(item) for item in extras) + ")."

            sentences.append(sentence)

        return " ".join(sentences)

    def explain_phone_profile(self, phone, users, calls):
        phone_number = phone.get("phone_number")
        lines = [f"Phone number: {phone_number}."]

        if phone.get("phone_id"):
            lines.append(f"Phone ID: {phone.get('phone_id')}.")

        if users:
            names = [
                user.get("name") or user.get("person_id")
                for user in users
            ]
            lines.append(
                "Associated person(s): " + ", ".join(names) + "."
            )
        else:
            lines.append(
                f"No person is associated with phone number {phone_number} "
                "in the knowledge graph."
            )

        lines.append(self.explain_phone_calls(phone_number, calls))

        return " ".join(lines)

    def explain_vehicle_records(self, records):
        if not records:
            return ""

        sentences = []

        for record in records:
            registration = record.get("registration_number") or record.get("vehicle_id")
            sentence = f"Vehicle registration {registration}"

            details = []

            if record.get("maker"):
                details.append(f"maker {record.get('maker')}")

            if record.get("model"):
                details.append(f"model {record.get('model')}")

            if record.get("color"):
                details.append(f"color {record.get('color')}")

            if details:
                sentence += " (" + ", ".join(details) + ")"

            owner = record.get("person_name")
            if owner:
                sentence += f" is owned by {owner}."
            else:
                sentence += " has no owner recorded in the knowledge graph."

            sentences.append(sentence)

        return " ".join(sentences)

    def explain_account_records(self, records):
        if not records:
            return ""

        sentences = []

        for record in records:
            account_number = record.get("account_number") or record.get("account_id")
            sentence = f"Bank account {account_number}"

            details = []

            if record.get("bank_name"):
                details.append(f"bank {record.get('bank_name')}")

            if record.get("ifsc_code"):
                details.append(f"IFSC {record.get('ifsc_code')}")

            if details:
                sentence += " (" + ", ".join(details) + ")"

            owner = record.get("person_name")
            if owner:
                sentence += f" is owned by {owner}."
            else:
                sentence += " has no owner recorded in the knowledge graph."

            sentences.append(sentence)

        return " ".join(sentences)

    def explain_license_records(self, records):
        if not records:
            return ""

        sentences = []

        for record in records:
            license_number = record.get("license_number") or record.get("license_id")
            sentence = f"License {license_number}"

            if record.get("state"):
                sentence += f" (state {record.get('state')})"

            owner = record.get("person_name")
            if owner:
                sentence += f" is held by {owner}."
            else:
                sentence += " has no holder recorded in the knowledge graph."

            sentences.append(sentence)

        return " ".join(sentences)

    def get_connection_details(self, person_a, person_b):
        query = """
        MATCH (a:Person {person_id: $person_a})
        MATCH (b:Person {person_id: $person_b})

        MATCH path = shortestPath((a)-[*..4]-(b))

        RETURN
            [node IN nodes(path) | {
                labels: labels(node),
                properties: properties(node)
            }] AS nodes,
            [rel IN relationships(path) | type(rel)] AS relationships
        """

        return self.client.execute_query(
            query,
            {
                "person_a": person_a,
                "person_b": person_b
            }
        )
    
    def close(self):
        self.client.close()
