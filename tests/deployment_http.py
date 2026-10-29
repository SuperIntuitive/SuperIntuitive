"""Deployment regressions run by security_http.py against its disposable MySQL fixture."""
import json


def run_checks(request, dbsql, check, csrf, fresh_client, csrf_for, password):
    page_id = dbsql("SELECT HEX(id) FROM pages WHERE path='' LIMIT 1")
    block_id = dbsql("SELECT HEX(id) FROM blocks WHERE name='Menu' LIMIT 1")
    relation_id = dbsql("SELECT HEX(id) FROM relations WHERE parent_id=UNHEX('" + page_id + "') AND child_id=UNHEX('" + block_id + "') LIMIT 1")
    records = [('pages', page_id), ('blocks', block_id), ('relations', relation_id)]
    snapshots = []

    def write(table, record_id, field, value):
        sql_value = 'NULL' if value is None else "UNHEX('" + str(value).encode().hex() + "')"
        dbsql("UPDATE `" + table + "` SET `" + field + "`=" + sql_value + " WHERE id=UNHEX('" + record_id + "')")

    def read(table, record_id, field):
        value = dbsql("SELECT HEX(CAST(`" + field + "` AS BINARY)) FROM `" + table + "` WHERE id=UNHEX('" + record_id + "')")
        return None if value == 'NULL' else bytes.fromhex(value).decode()

    def send(data, endpoint='/delegate-admin.php', client=None, token=csrf):
        kwargs = {} if client is None else {'client': client}
        status, body = request(endpoint, data, token, **kwargs)
        try:
            result = json.loads(body)
        except json.JSONDecodeError:
            raise AssertionError('Deployment request returned non-JSON HTTP ' + str(status))
        return status, result[0] if isinstance(result, list) and result else result

    def promote(table, record_id, attribute, target):
        return send(dict(KEY='Promote', entityname=table, entityid='0x' + record_id, attribute=attribute, deployment=target))

    for table, record_id in records:
        columns = dbsql("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='" + table + "' AND (COLUMN_NAME REGEXP '^(live|test|dev|rollback)-' OR COLUMN_NAME='modifiedon')").splitlines()
        snapshots.append((table, record_id, {column: read(table, record_id, column) for column in columns}))

    options = {
        'tag': 'section', 'style': {'width': '100%', 'height': 'auto'},
        'settings': {'quote': "O'Reilly \\ path \"quoted\"", 'unicode': 'Café 日本語 🚀',
                     'sql': "text'); DROP TABLE users; --", 'null_string': 'null',
                     'enabled': False, 'optional': None, 'empty_object': {}, 'empty_array': []},
        'widgets': {}, 'nested': [{'object': {}, 'array': [], 'flag': False, 'zero': 0}]
    }
    try:
        # The options object crosses JavaScript JSON -> PHP -> SQL -> JSON.parse.
        status, result = send(dict(KEY='BlockSave', guid='0x' + block_id, relationsId='0x' + relation_id, name='Menu', options=options))
        check(status == 200 and 'BLOCKSAVED' in result, 'Block options save successfully')
        saved = read('relations', relation_id, 'dev-options')
        check(json.loads(saved) == options, 'SQL JSON round trip preserves objects, arrays, false, null, Unicode, quotes, and backslashes')
        status, result = send({'Operation': 'Update', 'Entity': {'Name': 'relations', 'Id': '0x' + relation_id, 'Attributes': {'dev-options': options}}}, '/api.v1.php')
        check(status == 200 and result.get('Success') is True and json.loads(read('relations', relation_id, 'dev-options')) == options, 'Entity API also preserves JSON objects and arrays without double encoding')
        status, result = send({'Operation': 'Update', 'Entity': {'Name': 'relations', 'Id': '0x' + relation_id, 'Attributes': {'dev-options': json.dumps(json.dumps(options))}}}, '/api.v1.php')
        check(status == 400 and 'ERROR' in result, 'Entity API rejects double-encoded JSON before SQL')
        encoded = json.dumps(options, ensure_ascii=False, indent=2)
        status, result = send(dict(KEY='BlockSave', guid='0x' + block_id, relationsId='0x' + relation_id, name='Menu', options=encoded))
        check('BLOCKSAVED' in result and read('relations', relation_id, 'dev-options') == encoded, 'Already encoded options are validated and stored once')
        original_html = read('blocks', block_id, 'dev-html')
        for invalid in ('{broken', json.dumps(encoded), None, False, []):
            status, result = send(dict(KEY='BlockSave', guid='0x' + block_id, relationsId='0x' + relation_id, name='Menu', options=invalid, html='SHOULD NOT SAVE'))
            check('ERROR' in result and 'BLOCKSAVED' not in result and read('relations', relation_id, 'dev-options') == encoded and read('blocks', block_id, 'dev-html') == original_html, 'Invalid JSON options cannot partially save content: ' + repr(invalid)[:32])

        page_options = {'head': {'title': 'JSON deployment test', 'meta': {'name': {'description': options['settings']['quote']}}, 'extra': {}}, 'body': {'data': {'guid': '0x' + page_id}, 'extra': [], 'style': {}}, 'custom': options}
        status, result = send(dict(page_options, KEY='PageSave'))
        check('PAGESAVED' in result and result['PAGESAVED'].get('PAGEUPDATED') == 'true', 'Page JSON options save successfully')
        check(json.loads(read('pages', page_id, 'dev-options')) == page_options, 'Page SQL JSON preserves nested empty objects and arrays')

        # Promotion must copy bytes, without decoding/re-encoding or quoting the JSON again.
        for table, record_id in (('pages', page_id), ('relations', relation_id)):
            source = json.dumps(page_options if table == 'pages' else options, ensure_ascii=False, indent=2)
            write(table, record_id, 'dev-options', source)
            for target in ('test', 'live'):
                status, result = promote(table, record_id, 'options', target)
                check(status == 200 and 'PROMOTED' in result and read(table, record_id, target + '-options') == source, table + ' JSON promotes to ' + target + ' without changing stored bytes')
            status, result = promote(table, record_id, 'options', 'rollback')
            check('ERROR' in result and 'PROMOTED' not in result, table + ' rejects unavailable rollback columns with an explicit error')
            write(table, record_id, 'dev-options', json.dumps(source))
            status, result = promote(table, record_id, 'options', 'test')
            check('ERROR' in result and read(table, record_id, 'test-options') == source, 'Double-encoded source JSON cannot overwrite ' + table + ' Test options')

        status, result = send({'Operation': 'Update', 'Entity': {'Name': 'blocks', 'Id': '0x' + block_id, 'Attributes': {'dev-script': 'null'}}}, '/api.v1.php')
        check(result.get('Success') is True and read('blocks', block_id, 'dev-script') == 'null', 'SQL binding keeps the literal string null distinct from SQL NULL')
        original_scope = dbsql("SELECT HEX(entity_id) FROM blocks WHERE id=UNHEX('" + block_id + "')")
        try:
            dbsql("UPDATE blocks SET entity_id=UNHEX(REPEAT('f',32)) WHERE id=UNHEX('" + block_id + "')")
            status, result = promote('blocks', block_id, 'script', 'test')
            check('ERROR' in result and 'PROMOTED' not in result, 'Promotion cannot read or write a record belonging to another site scope')
        finally:
            dbsql("UPDATE blocks SET entity_id=UNHEX('" + original_scope + "') WHERE id=UNHEX('" + block_id + "')")
        for value in ('null', '', "const text = \"O'Reilly\\\\path 日本語\";", None):
            write('blocks', block_id, 'dev-script', value)
            for target in ('test', 'live', 'rollback'):
                status, result = promote('blocks', block_id, 'script', target)
                check(status == 200 and 'PROMOTED' in result and read('blocks', block_id, target + '-script') == value, 'Promotion preserves ' + repr(value) + ' at ' + target)
        write('relations', relation_id, 'dev-order', 0)
        write('relations', relation_id, 'test-order', 7)
        status, result = promote('relations', relation_id, 'order', 'test')
        check('PROMOTED' in result and read('relations', relation_id, 'test-order') == '0', 'Order zero is preserved during promotion')
        for field, value in (('attribute', 'options`; DROP TABLE users; --'), ('entityname', []), ('entityid', '0x' + 'f' * 32), ('deployment', 'dev'), ('attribute', 'name')):
            payload = dict(KEY='Promote', entityname='blocks', entityid='0x' + block_id, attribute='script', deployment='test')
            payload[field] = value
            status, result = send(payload)
            check(status == 200 and 'ERROR' in result and 'PROMOTED' not in result, 'Malformed or unsupported promotion fails without a false success: ' + field)
        check(dbsql('SELECT COUNT(*) FROM users') == '1', 'JSON and identifier payloads cannot alter the users table')

        # Promotion must enforce the entity permissions even for an Admin account.
        role_id = dbsql("SELECT HEX(id) FROM securityroles WHERE name='Admin' LIMIT 1")
        original_rules = read('securityroles', role_id, 'rules')
        rules = json.loads(original_rules)
        scope = dbsql("SELECT HEX(entity_id) FROM blocks WHERE id=UNHEX('" + block_id + "')")
        rule_key = next(key for key in rules if key.lower() == '0x' + scope.lower())
        rules[rule_key]['write'] = 'false'
        try:
            write('securityroles', role_id, 'rules', json.dumps(rules))
            status, result = promote('blocks', block_id, 'script', 'test')
            check('ERROR' in result and 'PROMOTED' not in result, 'Promotion honors a revoked write permission without refreshing the page')
        finally:
            write('securityroles', role_id, 'rules', original_rules)
            request()

        # Custom deployable fields must use the same column convention as the runtime.
        try:
            status, body = request('/delegate-admin.php', dict(KEY='NewEntity', sname='deployment_regression_item', pname='deployment_regression_items', attributes=[dict(name='config', type='TEXT', size='', **{'def': '{}', 'deploy': 'true'})]), csrf)
            columns = dbsql("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='deployment_regression_items' AND COLUMN_NAME LIKE '%config' ORDER BY COLUMN_NAME").splitlines()
            check(status == 200 and columns == ['dev-config', 'live-config', 'rollback-config', 'test-config'], 'Custom deployable SQL fields use the dev/test/live/rollback column convention')
        finally:
            dbsql('DROP TABLE IF EXISTS deployment_regression_items')

        tester_id, tester_relation = 'f' * 32, 'e' * 32
        try:
            dbsql("INSERT INTO users(id,entity_id,name,email,password,remembertoken,preferences) SELECT UNHEX('" + tester_id + "'),entity_id,'Deployment tester','deployment.tester@example.test',password,'','{}' FROM users WHERE email='admin@example.test'; INSERT INTO relations(id,entity_id,parententity_id,childentity_id,parent_id,child_id,note,`live-order`,`test-order`,`dev-order`) SELECT UNHEX('" + tester_relation + "'),r.entity_id,r.parententity_id,s.entity_id,UNHEX('" + tester_id + "'),s.id,'Deployment regression',0,0,0 FROM relations r INNER JOIN users u ON u.id=r.parent_id INNER JOIN securityroles s ON s.entity_id=r.childentity_id WHERE u.email='admin@example.test' AND s.name='Tester' LIMIT 1;")
            tester = fresh_client()
            tester_csrf = csrf_for(tester)
            status, result = send(dict(KEY='LoginAttempt', email='deployment.tester@example.test', password=password), '/delegate.php', tester, tester_csrf)
            check('REFRESH' in result, 'Tester account authenticates for preview checks')
            status, result = send(dict(KEY='ChangeDeployment', Deployment='test'), '/delegate.php', tester, tester_csrf)
            check('REFRESH' in result and request(client=tester)[0] == 200, 'Tester can preview Test content')
            status, result = send(dict(KEY='ChangeDeployment', Deployment='dev'), '/delegate.php', tester, tester_csrf)
            check('ERROR' in result and 'REFRESH' not in result, 'Tester cannot enter Dev')
            check(request('/editor/editor.js', client=tester)[0] == 403, 'Tester cannot access the editor data')
            status, result = send(dict(KEY='Promote', entityname='blocks', entityid='0x' + block_id, attribute='script', deployment='live'), client=tester, token=tester_csrf)
            check(status == 403, 'Tester cannot publish content')
            status, result = send(dict(KEY='ChangeDeployment', Deployment='live'), '/delegate.php', tester, tester_csrf)
            check('REFRESH' in result, 'Tester can return to Live')
        finally:
            dbsql("DELETE FROM relations WHERE id=UNHEX('" + tester_relation + "'); DELETE FROM users WHERE id=UNHEX('" + tester_id + "')")

        guest = fresh_client()
        guest_csrf = csrf_for(guest)
        status, result = send(dict(KEY='ChangeDeployment', Deployment='test'), '/delegate.php', guest, guest_csrf)
        check('ERROR' in result and 'REFRESH' not in result, 'Guests cannot switch to preview deployments')
        for level in ('test', 'live', 'dev'):
            status, result = send(dict(KEY='ChangeDeployment', Deployment=level), '/delegate.php')
            check('REFRESH' in result, 'Administrator can select ' + level + ' deployment')
        for level in ('rollback', [], 'dev; DROP TABLE users'):
            status, result = send(dict(KEY='ChangeDeployment', Deployment=level), '/delegate.php')
            check('ERROR' in result and 'REFRESH' not in result, 'Invalid preview deployment is rejected')
    finally:
        for table, record_id, fields in snapshots:
            for field, value in fields.items():
                write(table, record_id, field, value)
        send(dict(KEY='ChangeDeployment', Deployment='dev'), '/delegate.php')
        request()  # Rebuild page/session data from the restored fixture.
