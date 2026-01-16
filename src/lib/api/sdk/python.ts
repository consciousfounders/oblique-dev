// Python SDK Generator
// Generates Python SDK code for the Oblique CRM API

/**
 * Generate the Python SDK code as a downloadable string
 */
export function generatePythonSDK(): string {
  return `"""
Oblique CRM Python SDK
A comprehensive SDK for interacting with the Oblique CRM REST API.

Install:
    pip install oblique-crm-sdk

Or install from source:
    pip install requests
"""

import time
import hmac
import hashlib
from typing import Optional, Dict, List, Any, Union, TypeVar, Generic
from dataclasses import dataclass
from enum import Enum
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# Type variable for generic responses
T = TypeVar('T')


class EntityType(str, Enum):
    """Available entity types in the API."""
    ACCOUNTS = 'accounts'
    CONTACTS = 'contacts'
    LEADS = 'leads'
    DEALS = 'deals'
    DEAL_STAGES = 'deal_stages'
    ACTIVITIES = 'activities'
    USERS = 'users'


class LeadStatus(str, Enum):
    """Lead status values."""
    NEW = 'new'
    CONTACTED = 'contacted'
    QUALIFIED = 'qualified'
    UNQUALIFIED = 'unqualified'
    CONVERTED = 'converted'


class UserRole(str, Enum):
    """User role values."""
    ADMIN = 'admin'
    SDR = 'sdr'
    AE = 'ae'
    AM = 'am'


class FilterOperator(str, Enum):
    """Filter operators for queries."""
    EQ = 'eq'
    NEQ = 'neq'
    GT = 'gt'
    GTE = 'gte'
    LT = 'lt'
    LTE = 'lte'
    LIKE = 'like'
    ILIKE = 'ilike'
    IN = 'in'
    IS = 'is'


@dataclass
class RateLimitInfo:
    """Rate limit information from API response headers."""
    limit: int
    remaining: int
    reset: int


@dataclass
class PaginationMeta:
    """Pagination metadata."""
    total: int
    page: int
    limit: int
    has_more: bool


@dataclass
class BulkResult:
    """Result of a bulk operation."""
    success_count: int
    failure_count: int
    errors: Optional[List[Dict[str, str]]] = None


class ObliqueCRMError(Exception):
    """Exception raised for API errors."""

    def __init__(
        self,
        message: str,
        code: str,
        status: int,
        details: Optional[Dict[str, Any]] = None,
        rate_limit: Optional[RateLimitInfo] = None
    ):
        super().__init__(message)
        self.code = code
        self.status = status
        self.details = details
        self.rate_limit = rate_limit

    def __str__(self) -> str:
        return f"ObliqueCRMError({self.code}): {self.args[0]}"


class PaginatedResponse(Generic[T]):
    """Paginated response wrapper."""

    def __init__(self, data: List[T], meta: PaginationMeta):
        self.data = data
        self.meta = meta

    def __iter__(self):
        return iter(self.data)

    def __len__(self):
        return len(self.data)


class EntityResource(Generic[T]):
    """Generic entity resource for CRUD operations."""

    def __init__(self, client: 'ObliqueCRM', entity_name: str):
        self._client = client
        self._entity_name = entity_name

    def list(
        self,
        page: int = 1,
        limit: int = 50,
        sort_by: Optional[str] = None,
        sort_order: str = 'asc',
        fields: Optional[List[str]] = None,
        expand: Optional[List[str]] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> PaginatedResponse[T]:
        """List records with pagination and filtering."""
        params = {
            'page': page,
            'limit': limit,
        }
        if sort_by:
            params['sort_by'] = sort_by
            params['sort_order'] = sort_order
        if fields:
            params['fields'] = ','.join(fields)
        if expand:
            params['expand'] = ','.join(expand)
        if filters:
            for field, value in filters.items():
                if isinstance(value, dict) and 'operator' in value:
                    params[f'filter[{field}][{value["operator"]}]'] = value['value']
                elif value is None:
                    params[f'filter[{field}][is]'] = 'null'
                else:
                    params[field] = value

        response = self._client._request('GET', f'/{self._entity_name}', params=params)
        return PaginatedResponse(
            data=response.get('data', []),
            meta=PaginationMeta(
                total=response.get('meta', {}).get('total', 0),
                page=response.get('meta', {}).get('page', 1),
                limit=response.get('meta', {}).get('limit', 50),
                has_more=response.get('meta', {}).get('has_more', False)
            )
        )

    def get(
        self,
        id: str,
        fields: Optional[List[str]] = None,
        expand: Optional[List[str]] = None
    ) -> T:
        """Get a single record by ID."""
        params = {}
        if fields:
            params['fields'] = ','.join(fields)
        if expand:
            params['expand'] = ','.join(expand)

        response = self._client._request('GET', f'/{self._entity_name}/{id}', params=params)
        return response.get('data')

    def create(self, data: Dict[str, Any]) -> T:
        """Create a new record."""
        response = self._client._request('POST', f'/{self._entity_name}', json=data)
        return response.get('data')

    def update(self, id: str, data: Dict[str, Any]) -> T:
        """Update an existing record."""
        response = self._client._request('PATCH', f'/{self._entity_name}/{id}', json=data)
        return response.get('data')

    def delete(self, id: str) -> Dict[str, bool]:
        """Delete a record."""
        response = self._client._request('DELETE', f'/{self._entity_name}/{id}')
        return response.get('data')

    def search(
        self,
        query: str,
        page: int = 1,
        limit: int = 50,
        fields: Optional[List[str]] = None,
        expand: Optional[List[str]] = None
    ) -> PaginatedResponse[T]:
        """Search records."""
        params = {
            'q': query,
            'page': page,
            'limit': limit,
        }
        if fields:
            params['fields'] = ','.join(fields)
        if expand:
            params['expand'] = ','.join(expand)

        response = self._client._request('GET', f'/{self._entity_name}/search', params=params)
        return PaginatedResponse(
            data=response.get('data', []),
            meta=PaginationMeta(
                total=response.get('meta', {}).get('total', 0),
                page=response.get('meta', {}).get('page', 1),
                limit=response.get('meta', {}).get('limit', 50),
                has_more=response.get('meta', {}).get('has_more', False)
            )
        )

    def bulk_create(self, records: List[Dict[str, Any]]) -> BulkResult:
        """Bulk create records."""
        response = self._client._request(
            'POST',
            f'/{self._entity_name}/bulk',
            json={'records': records}
        )
        data = response.get('data', {})
        return BulkResult(
            success_count=data.get('success_count', 0),
            failure_count=data.get('failure_count', 0),
            errors=data.get('errors')
        )

    def bulk_update(self, ids: List[str], data: Dict[str, Any]) -> BulkResult:
        """Bulk update records."""
        response = self._client._request(
            'PATCH',
            f'/{self._entity_name}/bulk',
            json={'ids': ids, 'data': data}
        )
        result = response.get('data', {})
        return BulkResult(
            success_count=result.get('success_count', 0),
            failure_count=result.get('failure_count', 0),
            errors=result.get('errors')
        )

    def bulk_delete(self, ids: List[str]) -> BulkResult:
        """Bulk delete records."""
        response = self._client._request(
            'DELETE',
            f'/{self._entity_name}/bulk',
            json={'ids': ids}
        )
        result = response.get('data', {})
        return BulkResult(
            success_count=result.get('success_count', 0),
            failure_count=result.get('failure_count', 0),
            errors=result.get('errors')
        )


class ObliqueCRM:
    """
    Oblique CRM API Client.

    Example:
        >>> crm = ObliqueCRM(api_key='obl_your_api_key')
        >>> accounts = crm.accounts.list(limit=10)
        >>> for account in accounts:
        ...     print(account['name'])
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = 'https://api.oblique.dev',
        version: str = 'v1',
        timeout: int = 30,
        max_retries: int = 3,
        retry_backoff_factor: float = 0.5
    ):
        """
        Initialize the Oblique CRM client.

        Args:
            api_key: Your API key (starts with 'obl_')
            base_url: Base URL for the API
            version: API version to use
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries for failed requests
            retry_backoff_factor: Backoff factor for retries
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.version = version
        self.timeout = timeout

        # Set up session with retry logic
        self.session = requests.Session()
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=retry_backoff_factor,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=['GET', 'POST', 'PATCH', 'DELETE']
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)

        # Set default headers
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'Accept': f'application/vnd.oblique.{version}+json',
            'X-API-Version': version,
        })

        # Initialize entity resources
        self.accounts = EntityResource(self, 'accounts')
        self.contacts = EntityResource(self, 'contacts')
        self.leads = EntityResource(self, 'leads')
        self.deals = EntityResource(self, 'deals')
        self.deal_stages = EntityResource(self, 'deal_stages')
        self.activities = EntityResource(self, 'activities')
        self.users = EntityResource(self, 'users')

    def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make an authenticated API request."""
        url = f'{self.base_url}/api/{self.version}{endpoint}'

        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=json,
                timeout=self.timeout
            )

            # Parse rate limit info
            rate_limit = RateLimitInfo(
                limit=int(response.headers.get('X-RateLimit-Limit', 60)),
                remaining=int(response.headers.get('X-RateLimit-Remaining', 60)),
                reset=int(response.headers.get('X-RateLimit-Reset', 0))
            )

            # Handle rate limiting
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 60))
                raise ObliqueCRMError(
                    'Rate limit exceeded',
                    'rate_limited',
                    429,
                    {'retry_after': retry_after},
                    rate_limit
                )

            # Handle errors
            if not response.ok:
                try:
                    error_data = response.json()
                    raise ObliqueCRMError(
                        error_data.get('error', {}).get('message', 'API request failed'),
                        error_data.get('error', {}).get('code', 'unknown_error'),
                        response.status_code,
                        error_data.get('error', {}).get('details'),
                        rate_limit
                    )
                except requests.exceptions.JSONDecodeError:
                    raise ObliqueCRMError(
                        f'HTTP {response.status_code}',
                        'http_error',
                        response.status_code,
                        None,
                        rate_limit
                    )

            return response.json()

        except requests.exceptions.Timeout:
            raise ObliqueCRMError('Request timeout', 'timeout', 408)
        except requests.exceptions.ConnectionError:
            raise ObliqueCRMError('Connection error', 'connection_error', 0)

    def get_metadata(self, entity: Optional[str] = None) -> Dict[str, Any]:
        """
        Get entity metadata.

        Args:
            entity: Optional entity name. If not provided, returns all entities.

        Returns:
            Entity metadata dictionary.
        """
        endpoint = f'/metadata/{entity}' if entity else '/metadata'
        return self._request('GET', endpoint)


class WebhookVerifier:
    """Utility class for verifying webhook signatures."""

    def __init__(self, secret: str):
        """
        Initialize the webhook verifier.

        Args:
            secret: Your webhook secret (starts with 'whsec_')
        """
        self.secret = secret

    def verify(self, payload: bytes, signature: str) -> bool:
        """
        Verify a webhook signature.

        Args:
            payload: Raw request body bytes
            signature: X-Webhook-Signature header value

        Returns:
            True if signature is valid, False otherwise.
        """
        expected = 'sha256=' + hmac.new(
            self.secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected)


# Example usage
if __name__ == '__main__':
    # Initialize client
    crm = ObliqueCRM(api_key='obl_your_api_key_here')

    # List accounts
    accounts = crm.accounts.list(page=1, limit=10)
    print(f'Found {accounts.meta.total} accounts')

    for account in accounts:
        print(f'  - {account["name"]}')

    # Create an account
    new_account = crm.accounts.create({
        'name': 'Acme Corporation',
        'domain': 'acme.com',
        'industry': 'Technology'
    })
    print(f'Created account: {new_account["id"]}')

    # Get account with expanded relationships
    account = crm.accounts.get(
        new_account['id'],
        expand=['contacts', 'deals']
    )

    # Search contacts
    results = crm.contacts.search('john', limit=5)
    print(f'Found {results.meta.total} contacts matching "john"')

    # Bulk create contacts
    bulk_result = crm.contacts.bulk_create([
        {'first_name': 'Alice', 'email': 'alice@example.com'},
        {'first_name': 'Bob', 'email': 'bob@example.com'},
    ])
    print(f'Created {bulk_result.success_count} contacts')

    # Error handling
    try:
        crm.accounts.get('invalid-uuid')
    except ObliqueCRMError as e:
        print(f'Error: {e.code} - {e}')
        if e.rate_limit:
            print(f'Rate limit: {e.rate_limit.remaining}/{e.rate_limit.limit}')
`
}

/**
 * Generate Python webhook handler code
 */
export function generatePythonWebhookHandler(): string {
  return `"""
Oblique CRM Webhook Handler Examples

Flask example for handling webhooks from Oblique CRM.
"""

import hmac
import hashlib
from flask import Flask, request, jsonify

app = Flask(__name__)

# Your webhook secret from the Oblique CRM dashboard
WEBHOOK_SECRET = 'whsec_your_webhook_secret'


def verify_signature(payload: bytes, signature: str) -> bool:
    """Verify the webhook signature."""
    expected = 'sha256=' + hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)


@app.route('/webhooks/oblique', methods=['POST'])
def handle_webhook():
    """Handle incoming webhooks from Oblique CRM."""

    # Get signature from headers
    signature = request.headers.get('X-Webhook-Signature', '')

    # Get raw payload
    payload = request.get_data()

    # Verify signature
    if not verify_signature(payload, signature):
        return jsonify({'error': 'Invalid signature'}), 401

    # Parse event
    event = request.get_json()
    event_type = event.get('event')
    data = event.get('data', {})

    # Handle different event types
    if event_type == 'account.created':
        handle_account_created(data)

    elif event_type == 'contact.created':
        handle_contact_created(data)

    elif event_type == 'lead.converted':
        handle_lead_converted(data)

    elif event_type == 'deal.won':
        handle_deal_won(data)

    elif event_type == 'deal.lost':
        handle_deal_lost(data)

    elif event_type == 'deal.stage_changed':
        handle_deal_stage_changed(data)

    # Return success
    return jsonify({'received': True}), 200


def handle_account_created(data: dict):
    """Handle new account creation."""
    account = data.get('entity', {})
    print(f"New account created: {account.get('name')}")
    # Add your logic here (e.g., send welcome email, sync to other systems)


def handle_contact_created(data: dict):
    """Handle new contact creation."""
    contact = data.get('entity', {})
    print(f"New contact: {contact.get('first_name')} {contact.get('last_name')}")
    # Add your logic here


def handle_lead_converted(data: dict):
    """Handle lead conversion."""
    lead = data.get('entity', {})
    contact_id = data.get('changes', {}).get('converted_contact_id')
    print(f"Lead {lead.get('first_name')} converted to contact {contact_id}")
    # Add your logic here


def handle_deal_won(data: dict):
    """Handle deal won event."""
    deal = data.get('entity', {})
    value = deal.get('value', 0)
    print(f"Deal won! {deal.get('name')} - Value: $" + f"{value:,.2f}")
    # Add your logic here (e.g., trigger provisioning, send notification)


def handle_deal_lost(data: dict):
    """Handle deal lost event."""
    deal = data.get('entity', {})
    print(f"Deal lost: {deal.get('name')}")
    # Add your logic here


def handle_deal_stage_changed(data: dict):
    """Handle deal stage change."""
    deal = data.get('entity', {})
    previous_stage = data.get('previous_state', {}).get('stage_id')
    new_stage = deal.get('stage_id')
    print(f"Deal {deal.get('name')} moved from {previous_stage} to {new_stage}")
    # Add your logic here


if __name__ == '__main__':
    app.run(port=5000, debug=True)
`
}
